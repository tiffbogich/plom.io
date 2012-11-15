/**************************************************************************
 *    This file is part of plom.
 *
 *    plom is free software: you can redistribute it and/or modify it
 *    under the terms of the GNU General Public License as published
 *    by the Free Software Foundation, either version 3 of the
 *    License, or (at your option) any later version.
 *
 *    plom is distributed in the hope that it will be useful, but
 *    WITHOUT ANY WARRANTY; without even the implied warranty of
 *    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *    GNU General Public License for more details.
 *
 *    You should have received a copy of the GNU General Public
 *    License along with plom.  If not, see
 *    <http://www.gnu.org/licenses/>.
 *************************************************************************/

#include "pmcmc.h"

/**
 * load X_0 for J-1 other particles
 */
void copy_X_0(struct s_X ***D_J_p_X, struct s_data *p_data)
{
    int i,j;

    for(j=1; j<J; j++) {
        memcpy(D_J_p_X[0][j]->proj, D_J_p_X[0][0]->proj, (N_PAR_SV*N_CAC + N_TS_INC_UNIQUE) * sizeof(double));
        for (i=0; i<p_data->p_it_only_drift->length; i++) {
            memcpy(D_J_p_X[0][j]->drift[i], D_J_p_X[0][0]->drift[i], p_data->routers[ p_data->p_it_only_drift->ind[i] ]->n_gp *sizeof(double) );
        }
    }

}

/**
 * run SMC
 */
void run_propag(
                struct s_X ***D_J_p_X, struct s_X ***D_J_p_X_tmp, struct s_par *p_par, struct s_hat ***D_p_hat_new,
                struct s_likelihood *p_like, struct s_data *p_data, struct s_calc **calc,
                void *sender, void *receiver, void *controller)
{

    if (OPTION_PIPELINE) {

        if (COMMAND_DETER) {
            run_SMC_zmq(D_J_p_X, D_J_p_X_tmp, p_par, *D_p_hat_new, p_like, p_data, calc, f_prediction_with_drift_deter, JCHUNK, sender, receiver, controller);
        } else {
            run_SMC_zmq(D_J_p_X, D_J_p_X_tmp, p_par, *D_p_hat_new, p_like, p_data, calc, f_prediction_with_drift_sto, JCHUNK, sender, receiver, controller);
        }

    } else {

        if (COMMAND_DETER) {
            run_SMC(D_J_p_X, D_J_p_X_tmp, p_par, *D_p_hat_new, p_like, p_data, calc, f_prediction_with_drift_deter, 1, NULL, NULL);
        } else {
            run_SMC(D_J_p_X, D_J_p_X_tmp, p_par, *D_p_hat_new, p_like, p_data, calc, f_prediction_with_drift_sto, 1, NULL, NULL);
        }

    }

}


/**
 * propose new p_best->proposed from p_best->mean
 *
 * IN FULL UPDATE CASE:
 *
 * new p_best->proposed is sampled by a MVN generator using the covariance matrix
 * 2.38²*epsilon²/n_to_be_estimated * var where:
 * - epsilon is dynamicaly tuned following the iterative law:
 *   epsilon(m) = epsilon(m-1) * exp(a^m * (acceptance rate - 0.23))
 * - var is the initial covariance if the number of accepted particles
 *   is lower than SWITCH, and the empirical one otherwise
 *
 * For the calculation, the collapsed Cholesky decomposition of var is used,
 * so the tuning factor is 2.38*epsilon/sqrt(n_to_be_estimated).
 *
 * The sampling expanded covariance matrix is stored
 * in p_best->var
 *
 * IN SEQUENTIAL UPDATE CASE:
 *
 * One component of p_best->proposed is sampled at each iteration
 * following a gaussian law. The covariances are the diagonal terms of
 * the initial covariance matrix (loaded from a covariace.output file
 * or filled with jump sizes. The components sampling order is shuffled
 * each time all components have been sampled (p_pMCMC_specific_data->has_cycled).
 */
void propose_new_theta_and_load_X0(double *sd_fac,
                                   struct s_best *p_best, struct s_X *p_X,
                                   struct s_par *p_par,
                                   struct s_data *p_data,
                                   struct s_pmcmc_calc_data *p_pmcmc_calc_data, struct s_calc *p_calc, int m)
{
    if (OPTION_FULL_UPDATE) {
        //////////////////////
        // FULL UPDATE CASE //
        //////////////////////
        int m_switch = p_pmcmc_calc_data->m_switch;
        int m_eps = p_pmcmc_calc_data->m_eps;

        // evaluate epsilon(m) = epsilon(m-1) * exp(a^(m-1) * (acceptance_rate(m-1) - 0.23))
        double global_acceptance_rate = p_pmcmc_calc_data->global_acceptance_rate;
        if (m>m_eps && m*global_acceptance_rate < m_switch) {
            p_pmcmc_calc_data->epsilon = p_pmcmc_calc_data->epsilon * exp(pow(p_pmcmc_calc_data->a, (double)(m-1)) * (global_acceptance_rate - 0.23));
#if FLAG_VERBOSE
            char str[STR_BUFFSIZE];
            snprintf(str, STR_BUFFSIZE, "epsilon = %f", p_pmcmc_calc_data->epsilon);
            print_log(str);
#endif
        // after switching epsilon is set back to 1
        } else {
            p_pmcmc_calc_data->epsilon = 1.0;
        }

        // evaluate tuning factor sd_fac = epsilon * 2.38/sqrt(n_to_be_estimated)
        *sd_fac = p_pmcmc_calc_data->epsilon * 2.38/sqrt(p_best->n_to_be_estimated);

        // fill p_best->var with p_best->var_sampling
        if(m*global_acceptance_rate >= m_switch) {
            gsl_matrix_memcpy(p_best->var, p_best->var_sampling);
        }

        // propose p_best->proposed ~ MVN(p_best->mean, p_best->var)
        propose_safe_theta_and_load_X0(p_best->proposed, p_best, *sd_fac, p_par, p_X, p_data, p_calc, sfr_rmvnorm, COMMAND_STO);

    } else {

        ////////////////////////////
        // SEQUENTIAL UPDATE CASE //
        ////////////////////////////

        /*generate a random value for a component "k" of proposed chosen
          randomly.  every number of parameters with jump_size > 0.0
          (n_to_be_estimated) we randomly shuffle the index of the n_to_be
          estimated parameter index. In between these shuffling event, we
          cycle throufh the shuffled indexes. Traces are printed every
          n_to_be_estimated iterations. This should mimate block update of
          the n_to_be_estimated component of theta while increasing the
          acceptance ratio
        */
        *sd_fac = 1.0;

        if(p_best->n_to_be_estimated > 0) { //due to the webApp all jump size can be 0.0...
            if(p_pmcmc_calc_data->has_cycled) {
                gsl_ran_shuffle(p_calc->randgsl, p_best->to_be_estimated, p_best->n_to_be_estimated, sizeof (unsigned int));
            }
        }
        propose_safe_theta_and_load_X0(p_best->proposed, p_best, 1.0, p_par, p_X, p_data, p_calc, ran_proposal_sequential, COMMAND_STO);
    }
}


void increment_iteration_counters(struct s_pmcmc_calc_data *p_pmcmc_calc_data, struct s_best *p_best, const int OPTION_FULL_UPDATE)
{
    if(OPTION_FULL_UPDATE) {
        p_pmcmc_calc_data->has_cycled = 1;
        p_pmcmc_calc_data->m_full_iteration ++;
        p_pmcmc_calc_data->cycle_id = p_best->n_to_be_estimated;
    } else {

        if (p_pmcmc_calc_data->cycle_id >= (p_best->n_to_be_estimated -1)) { // >= instead of  == because due to the webApp all jump size can be 0.0...
            p_pmcmc_calc_data->has_cycled = 1;
            p_pmcmc_calc_data->m_full_iteration += 1;
            p_pmcmc_calc_data->cycle_id = 0;
        } else {
            p_pmcmc_calc_data->has_cycled = 0;
            p_pmcmc_calc_data->cycle_id += 1;
        }

    }
}


void pMCMC(struct s_best *p_best, struct s_X ***D_J_p_X, struct s_X ***D_J_p_X_tmp, struct s_par *p_par, struct s_hat ***D_p_hat_prev, struct s_hat ***D_p_hat_new, struct s_hat **D_p_hat_best, struct s_likelihood *p_like, struct s_data *p_data, struct s_calc **calc)
{

    //////////////////
    // declarations //
    //////////////////

    int m;              // iteration index
    int is_accepted;    // boolean
    double alpha;       // acceptance rate
    double sd_fac;

    // syntactical shortcut
    struct s_pmcmc_calc_data *p_pmcmc_calc_data =  (struct s_pmcmc_calc_data *) calc[0]->method_specific_shared_data;

    // initialize time to calculate the computational time of a pMCMC iteration
#if FLAG_VERBOSE
    char str[255];
    int64_t time_pmcmc_begin, time_pmcmc_end; /* to calculate the computational time of a pMCMC iteration */
    time_pmcmc_begin = s_clock();
#endif

    // open output files
    FILE *p_file_best = sfr_fopen(SFR_PATH, GENERAL_ID, "best", "w", header_best, p_data);
    FILE *p_file_X;
    if (OPTION_TRAJ){
        p_file_X = sfr_fopen(SFR_PATH, GENERAL_ID, "X", "w", header_X, p_data);
    }

    void *context = NULL;
    void *sender = NULL;
    void *receiver = NULL;
    void *controller = NULL;





    if (OPTION_PIPELINE) {

#if FLAG_VERBOSE
        print_log("setting up zmq sockets...");
#endif
        context = zmq_init (1);

        //  Socket to send messages on
        sender = zmq_socket (context, ZMQ_PUSH);
        zmq_bind (sender, "tcp://*:5557");

        //  Socket to receive messages on
        receiver = zmq_socket (context, ZMQ_PULL);
        zmq_bind (receiver, "tcp://*:5558");

        //  Socket for worker control
        controller = zmq_socket (context, ZMQ_PUB);
        zmq_bind (controller, "tcp://*:5559");
    }


    /////////////////////////
    // initialization step //
    /////////////////////////

    m=0;

    // initialize SMC arguments (particle 0)
    back_transform_theta2par(p_par, p_best->proposed, p_data->p_it_all, p_data);
    linearize_and_repeat(D_J_p_X[0][0], p_par, p_data, p_data->p_it_par_sv);
    prop2Xpop_size(D_J_p_X[0][0], p_data, COMMAND_STO);
    theta_driftIC2Xdrift(D_J_p_X[0][0], p_best->proposed, p_data);

    //load X_0 for the J-1 other particles
    copy_X_0(D_J_p_X, p_data);

    //run SMC
    run_propag(D_J_p_X, D_J_p_X_tmp, p_par, D_p_hat_new, p_like, p_data, calc, sender, receiver, controller);

    p_like->Llike_new = p_like->Llike_best;

    if (OPTION_TRAJ) {
        sample_traj_and_print(p_file_X, D_J_p_X, p_par, p_data, p_like->select, p_like->weights, p_data->times, calc[0], 0);
    }

    //the initial iteration is "accepted"
    p_like->Llike_prev = p_like->Llike_new;
    //store the accepted value in p_best->mean
    gsl_vector_memcpy(p_best->mean, p_best->proposed);

    print_best(p_file_best, 0, p_best, p_data, p_like->Llike_best);

    // print iteration info
#if FLAG_VERBOSE
    time_pmcmc_end = s_clock();
    struct s_duration t_exec = time_exec(time_pmcmc_begin, time_pmcmc_end);
    sprintf(str, "iteration number:%d\t logV: %g\t accepted:%d computed in:= %dd %dh %dm %gs", m, p_like->Llike_best,p_like->accept, t_exec.d, t_exec.h, t_exec.m, t_exec.s);
    print_log(str);
#endif


    ////////////////
    // iterations //
    ////////////////

    for(m=1; m<M; m++) {
#if FLAG_VERBOSE
        time_pmcmc_begin = s_clock();
#endif

        increment_iteration_counters(p_pmcmc_calc_data, p_best, OPTION_FULL_UPDATE);

        // web interface
#if FLAG_JSON
        if (p_pmcmc_calc_data->has_cycled) {
            update_walk_rates(p_best, NULL, NULL, p_data);
            update_to_be_estimated(p_best);
        }
#endif
        swap_D_p_hat(D_p_hat_prev, D_p_hat_new);

        // generate new theta
        propose_new_theta_and_load_X0(&sd_fac, p_best, D_J_p_X[0][0], p_par, p_data, p_pmcmc_calc_data, calc[0], m);

        //load X_0 for the J-1 other particles
        copy_X_0(D_J_p_X, p_data);

        back_transform_theta2par(p_par, p_best->proposed, p_data->p_it_par_proc_par_obs_no_drift, p_data);

        //run SMC
        run_propag(D_J_p_X, D_J_p_X_tmp, p_par, D_p_hat_new, p_like, p_data, calc, sender, receiver, controller);

        p_like->Llike_new = p_like->Llike_best;

        // acceptance
        is_accepted = metropolis_hastings(p_best, p_like, &alpha, p_data, calc[0], sd_fac, OPTION_FULL_UPDATE);
        compute_best_traj(D_p_hat_best, *D_p_hat_prev, *D_p_hat_new, p_data, (alpha>1.0) ? 1.0 : alpha, (double) m);

        if (is_accepted) {
            //we print only the accepted theta to save disk space
            if (OPTION_TRAJ) {
                sample_traj_and_print(p_file_X, D_J_p_X, p_par, p_data, p_like->select, p_like->weights, p_data->times, calc[0], m);
            }
            p_like->Llike_prev = p_like->Llike_new;
            gsl_vector_memcpy(p_best->mean, p_best->proposed);

        } else if(!OPTION_FULL_UPDATE) {
            //required if sequential update:
            gsl_vector_set(p_best->proposed,
                           p_best->to_be_estimated[ p_pmcmc_calc_data->cycle_id ],
                           gsl_vector_get(p_best->mean, p_best->to_be_estimated[ p_pmcmc_calc_data->cycle_id ]));
        }

        compute_acceptance_rates(p_best, p_pmcmc_calc_data, (double) is_accepted, m);


#if FLAG_VERBOSE
        time_pmcmc_end = s_clock();
        struct s_duration t_exec = time_exec(time_pmcmc_begin, time_pmcmc_end);
        sprintf(str, "iteration number: %d (%d / %d)\t logV: %g (previous was %g) accepted: %d computed in:= %dd %dh %dm %gs", p_pmcmc_calc_data->m_full_iteration, p_pmcmc_calc_data->cycle_id, p_best->n_to_be_estimated, p_like->Llike_best, p_like->Llike_prev, p_like->accept, t_exec.d, t_exec.h, t_exec.m, t_exec.s);
        print_log(str);
#endif


        if (p_pmcmc_calc_data->cycle_id >= (p_best->n_to_be_estimated -1)) { // >= instead of  == because due to the webApp all jump size can be 0.0...
            // evaluate empirical covariance
            eval_var_emp(p_best, (double) p_pmcmc_calc_data->m_full_iteration);

            // append output files
            print_best(p_file_best, p_pmcmc_calc_data->m_full_iteration, p_best, p_data, p_like->Llike_prev);
#if FLAG_VERBOSE
            print_acceptance_rates(p_pmcmc_calc_data, p_pmcmc_calc_data->m_full_iteration);
#endif
        }

    }

    /////////////////
    // terminating //
    /////////////////

    sfr_fclose(p_file_best);

    if (OPTION_TRAJ) {
        sfr_fclose(p_file_X);
    }


    if (OPTION_PIPELINE){

#if FLAG_VERBOSE
        print_log("killing the workers...");
#endif
        sfr_send (controller, "KILL");

#if FLAG_VERBOSE
        print_log("closing zmq sockets...");
#endif
        zmq_close (sender);
        zmq_close (receiver);
        zmq_close (controller);

        zmq_term (context);
    }
}

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

#include "kalman.h"

struct s_kalman_specific_data *build_kalman_specific_data(struct s_data *p_data, struct s_common *p_common, struct s_kal *p_kal)
{

    int i;

    struct s_kalman_specific_data *p;
    p = malloc(sizeof(struct s_kalman_specific_data));
    if(p==NULL){
        char str[STR_BUFFSIZE];
        sprintf(str, "Allocation impossible in file :%s line : %d",__FILE__,__LINE__);
        print_err(str);
        exit(EXIT_FAILURE);
    }

    //compo_groups_drift_par_proc
    p->compo_groups_drift_par_proc = malloc(N_DRIFT_PAR_PROC* sizeof (struct s_group **));
    if(p->compo_groups_drift_par_proc==NULL) {
        char str[STR_BUFFSIZE];
        sprintf(str, "Allocation impossible in file :%s line : %d",__FILE__,__LINE__);
        print_err(str);
        exit(EXIT_FAILURE);
    }
    for(i=0; i<N_DRIFT_PAR_PROC; i++) {
        p->compo_groups_drift_par_proc[i] = get_groups_compo(p_data->routers[ p_data->p_drift->ind_par_Xdrift_applied[i] ]);
    }

    //temporary variable used in func_kal for covariance computation
    p->FtCt = gsl_matrix_alloc(N_KAL, N_KAL);	// for Ft*Ct
    p->res = gsl_matrix_alloc(N_KAL, N_KAL);	// for Ft*Ct+Ct*Ft'+Q

    //store reference
    p->Q = p_common->Q;
    p->Ft = p_kal->Ft;

    // demographic stochasticity matrices
    N_REAC = init_REAC(p_data->obs2ts);
    p->F = malloc(N_REAC*sizeof(double));
    p->S = gsl_matrix_calloc(N_KAL, N_REAC);
    eval_S(p->S, p_data->obs2ts);
    p->SF = gsl_matrix_calloc(N_KAL, N_REAC);
    p->G = gsl_matrix_alloc(N_KAL, N_KAL);

    return p;

}


void clean_kalman_specific_data(struct s_calc *p_calc, struct s_data *p_data)
{
    int i;

    struct s_kalman_specific_data *p =  (struct s_kalman_specific_data *) p_calc->method_specific_thread_safe_data;

    //compo_groups_drift_par_proc
    for(i=0; i<N_DRIFT_PAR_PROC; i++) {
        clean_groups_compo(p->compo_groups_drift_par_proc[i], p_data->routers[ p_data->p_drift->ind_par_Xdrift_applied[i] ]->n_gp );
    }
    FREE(p->compo_groups_drift_par_proc);

    gsl_matrix_free(p->FtCt);
    gsl_matrix_free(p->res);

    FREE(p->F);
    gsl_matrix_free(p->S);
    gsl_matrix_free(p->SF);
    gsl_matrix_free(p->G);

    FREE(p);
}



struct s_kal *build_kal(void)
{
    struct s_kal *p_kal;
    p_kal = malloc(sizeof(struct s_kal));
    if(p_kal==NULL) {
        char str[STR_BUFFSIZE];
        sprintf(str, "Allocation impossible in file :%s line : %d",__FILE__,__LINE__);
        print_err(str);
        exit(EXIT_FAILURE);
    }

    p_kal->xk = gsl_vector_calloc(N_KAL);

    p_kal->Ct = gsl_matrix_calloc(N_KAL, N_KAL);
    p_kal->Ft = gsl_matrix_calloc(N_KAL, N_KAL);

    p_kal->kt = gsl_vector_calloc(N_KAL);

    p_kal->sc_st = 0.0;
    p_kal->sc_pred_error = 0.0;
    p_kal->sc_rt = 0.0;

    return p_kal;
}

void clean_kal(struct s_kal *p_kal)
{
    gsl_vector_free(p_kal->xk);

    gsl_matrix_free(p_kal->Ct);
    gsl_matrix_free(p_kal->Ft);

    gsl_vector_free(p_kal->kt);

    FREE(p_kal);
}


struct s_common *build_common(void)
{
    struct s_common *p_common;
    p_common = malloc(sizeof(struct s_common));
    if(p_common==NULL) {
        char str[STR_BUFFSIZE];
        sprintf(str, "Allocation impossible in file :%s line : %d",__FILE__,__LINE__);
        print_err(str);
        exit(EXIT_FAILURE);
    }

    p_common->Q = gsl_matrix_calloc(N_KAL, N_KAL);
    p_common->ht = gsl_vector_calloc(N_KAL);

    return p_common;
};


void clean_common(struct s_common *p_common)
{
    gsl_matrix_free(p_common->Q);
    gsl_vector_free(p_common->ht);

    FREE(p_common);
}



struct s_kalman *build_kalman(json_t * root, int is_bayesian)
{
    char str[STR_BUFFSIZE];
    int nt;

    struct s_kalman *p_kalman;
    p_kalman = malloc(sizeof(struct s_kalman));
    if(p_kalman==NULL) {
        sprintf(str, "Allocation impossible in file :%s line : %d",__FILE__,__LINE__);
        print_err(str);
        exit(EXIT_FAILURE);
    }

    p_kalman->p_data = build_data(root, is_bayesian);
    p_kalman->p_X = build_X(p_kalman->p_data);
    p_kalman->p_best = build_best(p_kalman->p_data, root);

    N_KAL = N_PAR_SV*N_CAC + N_TS + p_kalman->p_data->p_it_only_drift->nbtot;
    p_kalman->calc = build_calc(GENERAL_ID,
                                N_PAR_SV*N_CAC +N_TS_INC_UNIQUE //(X size)
                                + (N_KAL*(N_KAL+1)/2),
                                func_kal, //(Ct size)
                                p_kalman->p_data);
    p_kalman->p_par = build_par(p_kalman->p_data);

    p_kalman->smallest_log_like = get_smallest_log_likelihood(p_kalman->p_data->data_ind);
    p_kalman->p_kal = build_kal();
    p_kalman->p_common = build_common();

    for(nt=0; nt< N_THREADS; nt++) {
        p_kalman->calc[nt]->method_specific_thread_safe_data = build_kalman_specific_data(p_kalman->p_data, p_kalman->p_common, p_kalman->p_kal);
    }

    return p_kalman;
}


void clean_kalman(struct s_kalman *p_kalman)
{
    clean_X(p_kalman->p_X);
    clean_best(p_kalman->p_best);
    clean_par(p_kalman->p_par);
    clean_kal(p_kalman->p_kal);
    clean_common(p_kalman->p_common);

    clean_kalman_specific_data(p_kalman->calc[0], p_kalman->p_data);
    clean_calc(p_kalman->calc);
    clean_data(p_kalman->p_data);

    FREE(p_kalman);
}

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

#include "plom.h"

int main(int argc, char *argv[])
{
    int ch;
    char str[STR_BUFFSIZE];
    int i,j;

    /* set default values for the options */

    char sfr_help_string[] =
        "Plom Sequential Monte Carlo\n"
        "usage:\n"
        "smc <command> [--traj] [-p, --path <path>] [-i, --id <integer>] [-P, --N_THREAD <integer>]\n"
        "              [-t, --no_filter] [-b, --no_best] [-h, --no_hat]\n"
        "              [-s, --DT <float>] [-l, --LIKE_MIN <float>] [-J <integer>]\n"
        "              [--help]\n"
        "where command is 'deter' or 'sto'\n"
        "options:\n"
        "--traj             print the trajectories\n"
        "-p, --path         path where the outputs will be stored\n"
        "-i, --id           general id (unique integer identifier that will be appended to the output files)\n"
        "-P, --N_THREAD     number of threads to be used (default to the number of cores)\n"
        "-t, --no_filter    do not filter\n"
        "-b, --no_best      do not write best_<general_id>.output file\n"
        "-h, --no_hat       do not write hat_<general_id>.output file\n"
        "-r, --no_pred_res   do not write pred_res_<general_id>.output file (prediction residuals)\n"
        "-s, --DT           integration time step\n"
        "-l, --LIKE_MIN     particles with likelihood smaller that LIKE_MIN are considered lost\n"
        "-J                 number of particles\n"
        "--help             print the usage on stdout\n";


    int filter = 1;
    int output_best = 1;
    int output_hat = 1;
    int output_pred_res =1;
    int has_dt_be_specified = 0;
    double dt_option;

    OPTION_TRAJ = 0;
    OPTION_PRIOR = 0;
    COMMAND_DETER = 0;
    COMMAND_STO = 0;
    GENERAL_ID =0;
    snprintf(SFR_PATH, STR_BUFFSIZE, "%s", DEFAULT_PATH);
    J=1;
    LIKE_MIN = 1e-17;
    LOG_LIKE_MIN = log(1e-17);
    N_THREADS=omp_get_max_threads();


    while (1) {
        static struct option long_options[] =
            {
                /* These options set a flag. */
                {"traj", no_argument,       &OPTION_TRAJ, 1},
                /* These options don't set a flag We distinguish them by their indices (that are also the short option names). */
                {"help",       no_argument,       0, 'e'},
                {"path",       required_argument, 0, 'p'},
                {"id",         required_argument, 0, 'i'},
                {"N_THREAD",   required_argument, 0, 'P'},
                {"no_filter",  no_argument,       0, 't'},
                {"no_best",    no_argument,       0, 'b'},
                {"no_hat",     no_argument,       0, 'h'},
                {"no_pred_res",no_argument,       0, 'r'},

                {"DT",         required_argument, 0, 's'},
                {"LIKE_MIN",   required_argument, 0, 'l'},

                {0, 0, 0, 0}
            };
        /* getopt_long stores the option index here. */
        int option_index = 0;

        ch = getopt_long (argc, argv, "p:i:J:l:tbhrs:P:", long_options, &option_index);

        /* Detect the end of the options. */
        if (ch == -1)
            break;

        switch (ch) {
        case 0:
            /* If this option set a flag, do nothing else now. */
            if (long_options[option_index].flag != 0) {
                break;
            }
            break;

        case 'e':
            print_log(sfr_help_string);
            return 1;

        case 'p':
            snprintf(SFR_PATH, STR_BUFFSIZE, "%s", optarg);
            break;
        case 'i':
            GENERAL_ID = atoi(optarg);
            break;
        case 't':
            filter = 0;
            break;
        case 'J':
            J = atoi(optarg);
            break;
        case 'P':
            N_THREADS = atoi(optarg);
            break;
        case 'l':
            LIKE_MIN = atof(optarg);
            LOG_LIKE_MIN = log(LIKE_MIN);
            break;
        case 'b':
            output_best = 0;
            break;
        case 'h':
            output_hat = 0;
            break;
        case 'r':
            output_pred_res = 0;
            break;
        case 's':
            dt_option = atof(optarg);
            has_dt_be_specified =1;
            break;

        case '?':
            /* getopt_long already printed an error message. */
            break;

        default:
            snprintf(str, STR_BUFFSIZE, "Unknown option '-%c'\n", optopt);
            print_err(str);
            return 1;
        }
    }
    argc -= optind;
    argv += optind;

    if(argc != 1) {
        print_log(sfr_help_string);
        return 1;
    }
    else {
        if (!strcmp(argv[0], "deter")) {
            COMMAND_DETER = 1;
        } else if (!strcmp(argv[0], "sto")) {
            COMMAND_STO = 1;
        } else {
            print_log(sfr_help_string);
            return 1;
        }
    }


    json_t *root = load_json();
    load_const(root);

    if (has_dt_be_specified) {
        DT = dt_option;
    }

    //IMPORTANT: update DELTA_STO so that DT = 1.0/DELTA_STO
    DELTA_STO = round(1.0/DT);
    DT = 1.0/ ((double) DELTA_STO);


    N_THREADS = sanitize_n_threads(N_THREADS, J);
    omp_set_num_threads(N_THREADS); //set number of threads

    snprintf(str, STR_BUFFSIZE, "Starting Plom-smc with the following options: i = %d, J = %d, LIKE_MIN = %g, DT = %g, DELTA_STO = %g N_THREADS = %d", GENERAL_ID, J, LIKE_MIN, DT, DELTA_STO, N_THREADS);
    print_log(str);

#if FLAG_VERBOSE
    print_log("memory allocation and inputs loading...");
    int64_t time_begin, time_end;
#endif


    struct s_data *p_data = build_data(root, 0);
    struct s_calc **calc = build_calc(GENERAL_ID, N_PAR_SV*N_CAC +N_TS_INC_UNIQUE, func, p_data);
    struct s_par *p_par = build_par(p_data);
    struct s_hat **D_p_hat = build_D_p_hat(p_data);
    struct s_X ***D_J_p_X = build_D_J_p_X(p_data);
    struct s_X ***D_J_p_X_tmp = build_D_J_p_X(p_data);
    struct s_best *p_best = build_best(p_data, root);
    struct s_likelihood *p_like = build_likelihood();
    json_decref(root);

    FILE *p_file_X = (OPTION_TRAJ==1) ? sfr_fopen(SFR_PATH, GENERAL_ID, "X", "w", header_X, p_data): NULL;

    FILE *p_file_pred_res = (output_pred_res==1) ? sfr_fopen(SFR_PATH, GENERAL_ID, "pred_res", "w", header_prediction_residuals, p_data): NULL;


#if FLAG_VERBOSE
    print_log("starting computations...");
    time_begin = s_clock();
#endif

    //    transform_theta(p_best, transit, transit, 0);
    transform_theta(p_best, NULL, NULL, p_data, 0);

    back_transform_theta2par(p_par, p_best->mean, p_data->p_it_all, p_data);
    linearize_and_repeat(D_J_p_X[0][0], p_par, p_data, p_data->p_it_par_sv);
    prop2Xpop_size(D_J_p_X[0][0], p_data, COMMAND_STO);
    theta_driftIC2Xdrift(D_J_p_X[0][0], p_best->mean, p_data);

    for(j=1; j<J; j++) {  //load X_0 for the J-1 other particles
        memcpy(D_J_p_X[0][j]->proj, D_J_p_X[0][0]->proj, D_J_p_X[0][j]->size_proj * sizeof(double));
        for (i=0; i<p_data->p_it_only_drift->length; i++) {
            memcpy(D_J_p_X[0][j]->drift[i], D_J_p_X[0][0]->drift[i], p_data->routers[ p_data->p_it_only_drift->ind[i] ]->n_gp *sizeof(double) );
        }
    }

    if (COMMAND_DETER) {
        run_SMC(D_J_p_X, D_J_p_X_tmp, p_par, D_p_hat, p_like, p_data, calc, f_prediction_with_drift_deter, filter, p_file_X, p_file_pred_res);
    } else {
        run_SMC(D_J_p_X, D_J_p_X_tmp, p_par, D_p_hat, p_like, p_data, calc, f_prediction_with_drift_sto, filter, p_file_X, p_file_pred_res);
    }

#if FLAG_VERBOSE
    time_end = s_clock();
    struct s_duration t_exec = time_exec(time_begin, time_end);
    if(filter){
        snprintf(str, STR_BUFFSIZE, "logV: %g\tcomputed with %d particles in:= %dd %dh %dm %gs n_all_fail: %d", p_like->Llike_best, (int) J, t_exec.d, t_exec.h, t_exec.m, t_exec.s, p_like->n_all_fail);
    }  else{
        snprintf(str, STR_BUFFSIZE, "Done with %d particles in:= %dd %dh %dm %gs", (int) J, t_exec.d, t_exec.h, t_exec.m, t_exec.s);
    }

    print_log(str);
#endif

    if (p_file_X) {
        sfr_fclose(p_file_X);
    }

    if (p_file_pred_res) {
        sfr_fclose(p_file_pred_res);
    }

    if (output_hat) {
        FILE *p_file_hat = sfr_fopen(SFR_PATH, GENERAL_ID, "hat", "w", header_hat, p_data);
        print_hat(p_file_hat, D_p_hat, p_data);
        sfr_fclose(p_file_hat);
    }

    if (output_best) {
        FILE *p_file_best = sfr_fopen(SFR_PATH, GENERAL_ID, "best", "w", header_best, p_data);
        print_best(p_file_best, 0, p_best, p_data, p_like->Llike_best);
        sfr_fclose(p_file_best);
    }

#if FLAG_VERBOSE
    print_log("clean up...");
#endif

    clean_calc(calc);
    clean_D_J_p_X(D_J_p_X);
    clean_D_J_p_X(D_J_p_X_tmp);
    clean_D_p_hat(D_p_hat, p_data);
    clean_best(p_best);
    clean_par(p_par);
    clean_likelihood(p_like);
    clean_data(p_data);

    return 0;

}

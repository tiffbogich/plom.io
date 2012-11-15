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

#include "simulation.h"

int main(int argc, char *argv[])
{
    char ch;
    char str[255];
    int i, j;

    double abs_tol = ABS_TOL, rel_tol = REL_TOL;

    /* set default values for the options */

    char sfr_help_string[] =
        "Plom Simulation\n"
        "usage:\n"
        "simul <command> [--traj] [-p, --path <path>] [-i, --id <integer>] [-P, --N_THREAD <integer>]\n"
        "                [-s, --DT <float>] [-b, --bif] [-l, --lyap]\n"
        "                [-o, --t0 <integer>] [-D, --tend <integer>] [-T --transiant <integer>]\n"
        "                [-B, --block <integer>] [-x, --precision <float>] [-J <integer>]\n"
        "                [--help]\n"
        "where command is 'deter' or 'sto'\n"
        "options:\n"
        "--traj             print the trajectories\n"
        "-p, --path         path where the outputs will be stored\n"
        "-i, --id           general id (unique integer identifier that will be appended to the output files)\n"
        "-P, --N_THREAD     number of threads to be used (default to the number of cores)\n"
        "-s, --DT           integration time step\n"
        "-b, --bif          run a bifurcation analysis\n"
        "-l, --lyap         compute lyapunov exponents\n"
        "-d, --period_dyn   compute period (dynamical system def)\n"
        "-f, --fft          compute period (FFT)\n"
        "-o, --t0           time when the simulation starts\n"
        "-D, --tend         time when the simulation ends\n"
        "-T, --transiant    skip a transiant of the specified duration\n"
        "-B, --block        tuning parameter for max and min detection (has to be an odd number)\n"
        "-x, --precision    smallest significant difference to detect variation for min and max detections\n"
        "-J                 number of realisations\n"
        "--help             print the usage on stdout\n";


    double t0 = 0.0, t_end = 10.0, t_transiant = 0.0;
    int nn0 = 0; //for PAR_FIXED: t can be > N_DATA_PAR_FIXED: For transiant and lyap, we use p_calc->current_nn = t0 if t0 < N_DATA_PAR_FIXED. For traj_obs, we let p_calc->current_nn vary starting from nn0 and up to N_DATA_PAR_FIXED. After N_DATA_PAR_FIXED, the last value is recycled

    int has_dt_be_specified = 0;
    double dt_option;

    int OPTION_LYAP = 0;
    int OPTION_BIF = 0;
    int OPTION_PERIOD_DYNAMICAL_SYTEM = 0;
    int OPTION_FFT = 0;

    PRECISION = 1.0e-6;
    N_BLOC = 5;
    GENERAL_ID =0;
    snprintf(SFR_PATH, STR_BUFFSIZE, "%s", DEFAULT_PATH);
    J=1;

    COMMAND_DETER = 0;
    COMMAND_STO = 0;

    N_THREADS=omp_get_max_threads();

    while (1) {
        static struct option long_options[] =
            {
                /* These options set a flag. */
                {"traj", no_argument,       &OPTION_TRAJ, 1},
                /* These options don't set a flag We distinguish them by their indices (that are also the short option names). */
                {"help", no_argument,  0, 'e'},
                {"path",    required_argument, 0, 'p'},
                {"id",    required_argument, 0, 'i'},
                {"N_THREAD",   required_argument, 0, 'P'},

                {"DT",         required_argument, 0, 's'},

                {"bif",    no_argument, 0, 'b'},
                {"lyap",    no_argument, 0, 'l'},
                {"period_dyn",    no_argument, 0, 'd'},
                {"fft",    no_argument, 0, 'f'},

                {"t0",    required_argument, 0, 'o'},
                {"tend",    required_argument, 0, 'D'},
                {"transiant",    required_argument, 0, 'T'},
                {"block",    required_argument, 0, 'B'},
                {"precision",    required_argument, 0, 'x'},

                {0, 0, 0, 0}
            };
        /* getopt_long stores the option index here. */
        int option_index = 0;

        ch = getopt_long (argc, argv, "B:x:i:J:s:D:T:bldfp:o:P:", long_options, &option_index);

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
        case 'o':
            t0 = floor(atof(optarg));
            break;
        case 'D':
            t_end = ceil(atof(optarg));
            break;
        case 's':
            dt_option = atof(optarg);
            has_dt_be_specified = 1;
            break;
        case 'x':
            PRECISION = atof(optarg);
            break;
        case 'T':
            t_transiant = atof(optarg);
            break;
        case 'b':
            OPTION_BIF = 1;
            break;
        case 'l':
            OPTION_LYAP = 1;
            break;
        case 'd':
            OPTION_PERIOD_DYNAMICAL_SYTEM = 1;
            break;
        case 'f':
            OPTION_FFT = 1;
            break;
        case 'B':
            N_BLOC = atoi(optarg);
            break;
        case 'J':
            J = atoi(optarg);
            break;
        case 'P':
            N_THREADS = atoi(optarg);
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


    if (t0>t_end) {
        sprintf(str, "t0 = %g > t_end = %g, now quiting", t0, t_end);
        print_err(str);
        exit(EXIT_FAILURE);
    }


    json_t *root = load_json();
    load_const(root);

    if((OPTION_BIF || OPTION_LYAP) && (J>1)) {
        J=1;
        print_log("for bifurcation analysis and Lyapunov exp. comupations, J must be 1 !!");
    }

    N_THREADS = sanitize_n_threads(N_THREADS, J);
    omp_set_num_threads(N_THREADS); //set number of threads

    if (has_dt_be_specified) {
        DT = dt_option;
    }
    //IMPORTANT: update DELTA_STO so that DT = 1.0/DELTA_STO
    DELTA_STO = round(1.0/DT);
    DT = 1.0/ ((double) DELTA_STO);

    sprintf(str, "Starting Plom with the following options: i = %d, t0 = %g, t_end = %g, DT = %g, DELTA_STO = %g, t_transiant = %g, N_BLOC = %d, PRECISION = %g, N_THREADS = %d, J = %d", GENERAL_ID, t0, t_end, DT, DELTA_STO, t_transiant, N_BLOC, PRECISION, N_THREADS, J);
    print_log(str);


#if FLAG_VERBOSE
    print_log("memory allocation and inputs loading...");
#endif

    struct s_data *p_data = build_data(root, 0);
    struct s_calc **calc = build_calc(GENERAL_ID, N_PAR_SV*N_CAC +N_TS_INC_UNIQUE, func, p_data);
    struct s_par *p_par = build_par(p_data);
    struct s_X **J_p_X = build_J_p_X(p_data);
    struct s_best *p_best = build_best(p_data, root);

    json_decref(root);


    double *y0 = init1d_set0(N_PAR_SV*N_CAC + N_TS_INC_UNIQUE);

    //if t_transiant > N_DATA: mu_d = mu_b: we ensure constant pop size...
    if ((t_transiant > N_DATA) && (ORDER_mu_b >= 0)  && (ORDER_mu_d >= 0)) {
        print_warning("variable birth and death rate detected, death rates have been set to birth rates to ensure a constant population size to analyze the attractor");

        int nn, cac;
        for (nn=0; nn < N_DATA_PAR_FIXED; nn++) {
            for (cac=0; cac < N_CAC; cac++) {
                p_data->par_fixed[ORDER_mu_d][nn][cac] = p_data->par_fixed[ORDER_mu_b][nn][cac];
            }
        }
    }

    //setting p_calc->current_nn
    if ( t0 < N_DATA_PAR_FIXED ) {
        nn0 = t0;
    } else {
        nn0 = N_DATA_PAR_FIXED -1;
    }
    store_state_current_n_nn(calc, 0, nn0);


#if FLAG_VERBOSE
    print_log("starting computations...");
#endif

    if (OPTION_FFT) {
#if FLAG_VERBOSE
        print_warning("FFT requested, to compute FFT we change the trajectory length to its nearest upper power of 2 number...");
#endif
        sprintf(str, "t_end-t0: %g -> %g, the number of stored value being %g", t_end-t0, nextpow2((t_end-t0)),  nextpow2((t_end-t0)));
        print_warning(str);

        t_end = t0 + nextpow2((t_end-t0));
    }


    transform_theta(p_best, NULL, NULL, p_data, 0);
    back_transform_theta2par(p_par, p_best->mean, p_data->p_it_all, p_data);
    linearize_and_repeat(J_p_X[0], p_par, p_data, p_data->p_it_par_sv);
    prop2Xpop_size(J_p_X[0], p_data, COMMAND_STO);
    theta_driftIC2Xdrift(J_p_X[0], p_best->mean, p_data);
    for(j=1; j<J; j++) {  //load X_0 for the J-1 other particles
        memcpy(J_p_X[j]->proj, J_p_X[0]->proj, J_p_X[j]->size_proj * sizeof(double));
        for (i=0; i<p_data->p_it_only_drift->length; i++) {
            memcpy(J_p_X[j]->drift[i], J_p_X[0]->drift[i], p_data->routers[ p_data->p_it_only_drift->ind[i] ]->n_gp *sizeof(double) );
        }
    }

    for (i=0; i<(N_PAR_SV*N_CAC); i++){
        y0[i] = J_p_X[0]->proj[i];
    }

    /****************************************/
    /*************SKIP TRANSIANT*************/
    /****************************************/
    //NOTE: We do **not** consider drift when skipping transiants.

    if (t_transiant > 0.0) {
        t_transiant = floor(t_transiant/ONE_YEAR_IN_DATA_UNIT)*ONE_YEAR_IN_DATA_UNIT + t0;
#if FLAG_VERBOSE
        sprintf(str, "skipping transiant... (Note that t_transiant has been ajusted to %g to respect seasonality and t0)", t_transiant );
        print_warning(str);
#endif

        if (COMMAND_DETER) {
            if ( integrate(J_p_X[0], y0, t0, t_transiant, p_par, &abs_tol, &rel_tol, calc[0]) ) {
                print_err("integration error, the program will now quit");
                exit(EXIT_FAILURE);
            }
        } else {
            int thread_id, ip1;
            for(i=t0 ; i<t_transiant ; i++) {
                ip1 = i+1;
#pragma omp parallel for private(thread_id)
                for(j=0; j<J; j++) {
                    thread_id = omp_get_thread_num();
                    reset_inc(J_p_X[j]);
                    f_prediction_euler_multinomial(J_p_X[j]->proj, i, ip1, p_par, p_data, calc[thread_id]);
                }
            }
        }
    }


    /****************************************/
    /*************ONLY INITIAL CONDITIONS****/
    /****************************************/
    if(!(OPTION_BIF || OPTION_LYAP) && (t_end==0)) {
        FILE *p_file_hat = sfr_fopen(SFR_PATH, GENERAL_ID, "hat", "w", header_hat, p_data);
        struct s_hat *p_hat = build_hat(p_data);
        if (COMMAND_DETER) J = 1;
        compute_hat_nn(J_p_X, p_par, p_data, calc, p_hat);
        print_p_hat(p_file_hat, NULL, p_hat, p_data, -1);
        clean_hat(p_hat, p_data);
        sfr_fclose(p_file_hat);
    }

    /****************************************/
    /*************ONLY TRAJ******************/
    /****************************************/
    if(!(OPTION_BIF || OPTION_LYAP) && OPTION_TRAJ && (t_end>t0)) {
        traj(J_p_X, t0, t_end, t_transiant, p_par, p_data, calc);
    }

    /****************************************/
    /*************ABS_TOL & REL_TOL**********/
    /****************************************/
    //NOTE only for bifurcation analysis and Lyap exp computations...
    if (OPTION_BIF || OPTION_LYAP) {

        /*store (potentialy new, if t_transiant > 0.0) initial conditions*/
        for (i=0; i<(N_PAR_SV*N_CAC); i++){
            y0[i] = J_p_X[0]->proj[i];
        }
        reset_inc(J_p_X[0]);

#if FLAG_VERBOSE
        sprintf(str, "determining abs tol and rel tol (starting from abs_tol: %g,  rel_tol: %g)", ABS_TOL, REL_TOL);
        print_log(str);
#endif
        abs_tol=ABS_TOL; rel_tol=REL_TOL;
        if ( integrate(J_p_X[0], y0, t0, t_end, p_par,  &abs_tol, &rel_tol, calc[0]) ) {
            print_err("integration error, the program will now quit");
            exit(EXIT_FAILURE);
        }
#if FLAG_VERBOSE
        sprintf(str, "abs tol: %g rel tol: %g", abs_tol, rel_tol );
        print_log(str);
#endif

    }

    /****************************************/
    /*************BIF************************/
    /****************************************/

    if (OPTION_BIF || OPTION_PERIOD_DYNAMICAL_SYTEM || OPTION_FFT) {
        int ts;

#if FLAG_VERBOSE
        print_log("bifurcation analysis");
#endif

        double **traj_obs = get_traj_obs(J_p_X[0], y0, t0, t_end, t_transiant, p_par, p_data, calc[0]); //[N_TS][(t_end-t0)]

        for (ts=0; ts< N_TS; ts++) {

            if (OPTION_PERIOD_DYNAMICAL_SYTEM){
                period_dynamical_system(traj_obs[ts], (int) (t_end-t0), ts);
            }

            if (OPTION_BIF){
                max_min(traj_obs[ts], p_par, p_data, calc[0], t0, (int) (t_end-t0), ts);
            }

            if (OPTION_FFT){
                //fourrier has to be last as it modified traj_obs in place!!
                fourrier_power_spectrum(traj_obs[ts], (int) (t_end-t0), ts);
            }
        }

        clean2d(traj_obs, N_TS);
    }


    /****************************************/
    /*************LYAP***********************/
    /****************************************/

    if (COMMAND_DETER) {
        if (OPTION_LYAP) {
            store_state_current_n_nn(calc, 0, nn0);
#if FLAG_VERBOSE
            print_log("Lyapunov exponents computation...");
#endif
            lyapunov(calc[0], p_par, y0, t0, t_end, abs_tol, rel_tol);
        }
    }


#if FLAG_VERBOSE
    print_log("clean up...");
#endif

    FREE(y0);

    clean_J_p_X(J_p_X);
    clean_best(p_best);
    clean_par(p_par);
    clean_calc(calc);
    clean_data(p_data);

    return 0;

}

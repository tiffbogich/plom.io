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

double f_simplex_kalman(const gsl_vector *x, void *params)
{
    struct s_kalman *p = (struct s_kalman *) params;

    transfer_estimated(p->p_best, x); //needed for simplex_kalman (simplex take only into account parameter whith jump_size >0.0 (all stored in x)

    reset_kalman(p->p_kal, p->p_common);

    back_transform_theta2par(p->p_par, p->p_best->mean, p->p_data->p_it_all, p->p_data);
    linearize_and_repeat(p->p_X, p->p_par, p->p_data, p->p_data->p_it_par_sv);
    prop2Xpop_size(p->p_X, p->p_data, COMMAND_STO);
    theta_driftIC2Xdrift(p->p_X, p->p_best->mean, p->p_data);

    double log_lik = run_kalman(p->p_X, p->p_best, p->p_par, p->p_kal, p->p_common, p->p_data, p->calc, NULL, 0);

    // "-": simplex minimizes hence the "-"
    return - log_lik;
}

int main(int argc, char *argv[])
{

    char ch;
    char str[STR_BUFFSIZE];

    char sfr_help_string[] =
        "Plom simplex kalman\n"
        "usage:\n"
        "ksimplex <command> [-p, --path <path>] [-i, --id <integer>]\n"
        "                   [-s, --DT <float>] [--prior] [--transf]\n"
        "                   [-l, --LIKE_MIN <float>] [-S, --size <float>] [-M, --iter <integer>]\n"
        "                   [--help]\n"
        "where command is 'deter' or 'sto'\n"
        "options:\n"
        "--prior            to maximize posterior density in natural space\n"
        "--transf           to maximize posterior density in transformed space (if combined with --prior)\n"
        "-p, --path         path where the outputs will be stored\n"
        "-i, --id           general id (unique integer identifier that will be appended to the output files)\n"
        "-s, --DT           integration time step\n"
        "-l, --LIKE_MIN     particles with likelihood smaller that LIKE_MIN are considered lost\n"
        "-M, --iter         maximum number of iterations\n"
        "-S, --size         simplex size used as a stopping criteria\n"
        "--help             print the usage on stdout\n";


    // simplex options
    M = 10;
    CONVERGENCE_STOP_SIMPLEX = 1e-9;

    // general options
    int has_dt_be_specified = 0;
    double dt_option;

    GENERAL_ID =0;
    snprintf(SFR_PATH, STR_BUFFSIZE, "%s", DEFAULT_PATH);
    J=1;
    LIKE_MIN = 1e-17;
    LOG_LIKE_MIN = log(1e-17);

    // options
    OPTION_TRAJ = 0;
    OPTION_PRIOR = 0;
    OPTION_TRANSF = 0;


    // commands
    COMMAND_DETER = 0;
    COMMAND_STO = 0;

    static struct option long_options[] = {
        {"help",       no_argument,       0, 'e'},
        {"path",       required_argument, 0, 'p'},
        {"id",         required_argument, 0, 'i'},

        {"prior",  no_argument, &OPTION_PRIOR,  1},
        {"transf", no_argument, &OPTION_TRANSF, 1},

        {"DT",       required_argument, 0, 's'},
        {"LIKE_MIN", required_argument, 0, 'l'},
        {"iter",     required_argument,   0, 'M'},
        {"size",     required_argument,   0, 'S'},

        {0, 0, 0, 0}
    };


    N_THREADS = 1; //not an option

    int option_index = 0;
    while ((ch = getopt_long (argc, argv, "i:l:s:p:S:M:", long_options, &option_index)) != -1) {
        switch (ch) {
        case 0:
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
        case 's':
            dt_option = atof(optarg);
            has_dt_be_specified =1;
            break;

        case 'l':
            LIKE_MIN = atof(optarg);
            LOG_LIKE_MIN = log(LIKE_MIN);
            break;
        case 'M':
            M = atoi(optarg);
            break;
        case 'S':
            CONVERGENCE_STOP_SIMPLEX = atof(optarg);
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

#if FLAG_VERBOSE
    snprintf(str, STR_BUFFSIZE, "Starting Plom ksimplex with the following options: i = %d, LIKE_MIN = %g DT = %g DELTA_STO = %g", GENERAL_ID, LIKE_MIN, DT, DELTA_STO );
    print_log(str);
#endif


#if FLAG_VERBOSE
    print_log("memory allocation and inputs loading...\n");
#endif

    struct s_kalman *p_kalman = build_kalman(root, OPTION_PRIOR);
    json_decref(root);

#if FLAG_VERBOSE
    print_log("starting computations of simplex_kalman...\n");
#endif

    if (OPTION_PRIOR) {
        sanitize_best_to_prior(p_kalman->p_best, p_kalman->p_data);
    }

    transform_theta(p_kalman->p_best, NULL, NULL, p_kalman->p_data, 0);

    simplex(p_kalman->p_best, p_kalman->p_data, p_kalman, f_simplex_kalman, CONVERGENCE_STOP_SIMPLEX, M);

#if FLAG_VERBOSE
    print_log("clean up...\n");
#endif

    clean_kalman(p_kalman);

    return 0;
}

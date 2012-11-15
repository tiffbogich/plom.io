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

int main(int argc, char *argv[])
{
    char ch;
    char str[STR_BUFFSIZE];

    /* set default values for the options */
    char sfr_help_string[] =
        "Plom pMCMC\n"
        "usage:\n"
        "pmcmc <command> [--full] [--traj] [-p, --path <path>] [-i, --id <integer>] [-P, --N_THREAD <integer>]\n"
        "                [-s, --DT <float>] [-l, --LIKE_MIN <float>] [-J <integer>] [-M, --iter <integer>]\n"
        "                [-c --cov] [-a --cooling <float>] [-S --switch <int>] [-Z, --zmq] [-C, --chunk <integer>]\n"
        "                [--help]\n"
        "where command is 'deter' or 'sto'\n"
        "options:\n"
        "--full             full update MVN mode\n"
        "--traj             print the trajectories\n"
        "-c, --cov          load an initial covariance from the settings\n"
        "-p, --path         path where the outputs will be stored\n"
        "-i, --id           general id (unique integer identifier that will be appended to the output files)\n"
        "-P, --N_THREAD     number of threads to be used (default to the number of cores)\n"
        "-s, --DT           integration time step\n"
        "-l, --LIKE_MIN     particles with likelihood smaller that LIKE_MIN are considered lost\n"
        "-J                 number of particles\n"
        "-M, --iter         number of pMCMC iterations\n"
        "-Z, --zmq          dispatch particles across machines using a zeromq pipeline\n"
        "-C, --chunk        number of particles send to each machine\n"
        "-a, --cooling      cooling rate for sampling covariance live tuning\n"
        "-S, --switch       select switching iteration from initial covariance to empirical one\n"
        "-E, --epsilon      select number of burnin iterations before tuning epsilon\n"
        "--help             print the usage on stdout\n";

    int has_dt_be_specified = 0;
    double dt_option;
    int load_cov = 0;
    int m_switch = -1;
    int m_eps = 50;
    double a = 0.999;

    JCHUNK=1;
    GENERAL_ID =0;
    snprintf(SFR_PATH, STR_BUFFSIZE, "%s", DEFAULT_PATH);
    J=100;
    LIKE_MIN = 1e-17;
    LOG_LIKE_MIN = log(1e-17);
    M = 10;
    N_THREADS = omp_get_max_threads();
    OPTION_PIPELINE = 0;
    OPTION_FULL_UPDATE = 0;
    OPTION_TRAJ = 0;
    COMMAND_DETER = 0;
    COMMAND_STO = 0;

    while (1) {
        static struct option long_options[] =
            {
                /* These options set a flag. */
                {"traj", no_argument,       &OPTION_TRAJ, 1},
                {"full", no_argument, &OPTION_FULL_UPDATE, 1},
                {"cov", no_argument, 0, 'c'},

                /* These options don't set a flag We distinguish them by their indices (that are also the short option names). */
                {"help", no_argument,  0, 'e'},
                {"path",    required_argument, 0, 'p'},
                {"id",    required_argument, 0, 'i'},
                {"N_THREAD",  required_argument,       0, 'P'},

                {"DT",  required_argument, 0, 's'},
                {"LIKE_MIN",     required_argument,   0, 'l'},
                {"iter",     required_argument,   0, 'M'},
                {"zmq",     no_argument,   0, 'Z'},
                {"chunk",     required_argument,   0, 'C'},
                {"switch",     required_argument,   0, 'S'},
                {"epsilon",     required_argument,   0, 'E'},
                {"cooling",     required_argument,   0, 'a'},

                {0, 0, 0, 0}
            };
        /* getopt_long stores the option index here. */
        int option_index = 0;

        ch = getopt_long (argc, argv, "ci:J:l:M:p:C:s:P:ZS:E:a:", long_options, &option_index);

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

        case 'c':
            load_cov = 1;
            break;
        case 'Z':
            OPTION_PIPELINE = 1;
        case 'p':
            snprintf(SFR_PATH, STR_BUFFSIZE, "%s", optarg);
            break;
        case 'P':
            N_THREADS = atoi(optarg);
            break;
        case 'i':
            GENERAL_ID = atoi(optarg);
            break;
        case 'J':
            J = atoi(optarg);
            break;
        case 'C':
            JCHUNK = atoi(optarg);
            break;
        case 'l':
            LIKE_MIN = atof(optarg);
            LOG_LIKE_MIN = log(LIKE_MIN);
            break;
        case 'M':
            M = atoi(optarg);
            break;
        case 's':
            dt_option = atof(optarg);
            has_dt_be_specified =1;
            break;
        case 'a':
            a = atof(optarg);
            break;
        case 'S':
            m_switch = atoi(optarg);
            break;
        case 'E':
            m_eps = atoi(optarg);
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

    struct s_pmcmc *p_pmcmc = build_pmcmc(root, has_dt_be_specified, dt_option, a, m_switch, m_eps);

    sanitize_best_to_prior(p_pmcmc->p_best, p_pmcmc->p_data);

    transform_theta(p_pmcmc->p_best, NULL, NULL, p_pmcmc->p_data, 0);
    gsl_vector_memcpy(p_pmcmc->p_best->proposed, p_pmcmc->p_best->mean);

    //overwrite p_best->var with the covariance matrix of settings.json (NO FILE AS INPUT TO RESPECT THE WEBAPP)
    if ( (load_cov == 1) && (OPTION_FULL_UPDATE == 1)) {
        load_covariance(p_pmcmc->p_best->var, fast_get_json_array(fast_get_json_object(root, "parameters"), "covariance"));
    }

    json_decref(root);

    pMCMC(p_pmcmc->p_best, p_pmcmc->D_J_p_X, p_pmcmc->D_J_p_X_tmp, p_pmcmc->p_par, &(p_pmcmc->D_p_hat_prev), &(p_pmcmc->D_p_hat_new), p_pmcmc->D_p_hat_best, p_pmcmc->p_like, p_pmcmc->p_data, p_pmcmc->calc);

    FILE *p_file_hat = sfr_fopen(SFR_PATH, GENERAL_ID, "hat", "w", header_hat, p_pmcmc->p_data);
    print_hat(p_file_hat, p_pmcmc->D_p_hat_best, p_pmcmc->p_data);
    sfr_fclose(p_file_hat);

    // print empirical covariance
    FILE *p_file_cov = sfr_fopen(SFR_PATH, GENERAL_ID, "covariance", "w", NULL, NULL);
    print_covariance(p_file_cov, p_pmcmc->p_best->var_sampling);
    sfr_fclose(p_file_cov);

#if FLAG_VERBOSE
    print_log("clean up...\n");
#endif

    clean_pmcmc(p_pmcmc);

    return 0;
}

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

#include "mif.h"

int main(int argc, char *argv[])
{
    char ch;
    char str[STR_BUFFSIZE];

    /* set default values for the options */

    char sfr_help_string[] =
        "Plom MIF\n"
        "usage:\n"
        "smc <command> [--traj] [-p, --path <path>] [-i, --id <integer>] [-P, --N_THREAD <integer>]\n"
        "              [-s, --DT  <float>] [-l, --LIKE_MIN <float>] [-J <integer>] [-M, --iter <integer>]\n"
        "              [-a, --cooling <float>] [-b, --heat <float>] [-L, --lag <float>] [-S, --switch <integer>]\n"
        "              [-f --ic_only]\n"
        "              [--help]\n"
        "where command is 'deter' or 'sto'\n"
        "options:\n"

        "--prior            to maximize posterior density in natural space\n"
        "--traj             print the trajectories\n"
        "-p, --path         path where the outputs will be stored\n"
        "-i, --id           general id (unique integer identifier that will be appended to the output files)\n"
        "-P, --N_THREAD     number of threads to be used (default to the number of cores)\n"
        "-s, --DT           integration time step\n"
        "-l, --LIKE_MIN     particles with likelihood smaller that LIKE_MIN are considered lost\n"
        "-J                 number of particles\n"
        "-M, --iter         number of MIF iterations\n"
        "-a, --cooling      cooling factor (scales standard deviation)\n"
        "-b, --heat         re-heating across MIF iteration (scales standard deviation of the proposal)\n"
        "-L, --lag          lag for fixed lag smoothing (proportion of the data)\n"
        "-S, --switch       iteration number when the update formulae become the introduced in  Ionides et al. (2006)\n"
        "-f, --ic_only      only fit the initial condition using fixed lag smoothing\n"
        "--help             print the usage on stdout\n";

    int has_dt_be_specified = 0;
    double dt_option;
    double prop_L_option = 0.75;

    GENERAL_ID =0;
    snprintf(SFR_PATH, STR_BUFFSIZE, "%s", DEFAULT_PATH);
    J=100;

    LIKE_MIN = 1e-17;
    LOG_LIKE_MIN = log(LIKE_MIN);

    M = 1;
    MIF_a= 0.975;
    MIF_b = 2;
    prop_L_option = 0.75;
    SWITCH = 5;
    OPTION_IC_ONLY = 0;
    N_THREADS = omp_get_max_threads();
    OPTION_TRAJ = 0;
    OPTION_PRIOR = 0;

    while (1) {
        static struct option long_options[] =
            {
                /* These options set a flag. */
                {"prior", no_argument,       &OPTION_PRIOR, 1},
                {"traj", no_argument,       &OPTION_TRAJ, 1},
                /* These options don't set a flag We distinguish them by their indices (that are also the short option names). */
                {"help", no_argument,  0, 'e'},
                {"path",    required_argument, 0, 'p'},
                {"id",    required_argument, 0, 'i'},
                {"N_THREAD",  required_argument,       0, 'P'},

                {"DT",  required_argument, 0, 's'},
                {"LIKE_MIN",     required_argument,   0, 'l'},
                {"iter",     required_argument,   0, 'M'},
                {"cooling",     required_argument,   0, 'a'},
                {"heat",     required_argument,   0, 'b'},
                {"lag",     required_argument,   0, 'L'},
                {"switch",     required_argument,   0, 'S'},
                {"ic_only",     required_argument,   0, 'f'},

                {0, 0, 0, 0}
            };
        /* getopt_long stores the option index here. */
        int option_index = 0;

        ch = getopt_long (argc, argv, "i:J:l:M:a:b:L:S:fs:p:P:", long_options, &option_index);

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
        case 'P':
            N_THREADS = atoi(optarg);
            break;
        case 'i':
            GENERAL_ID = atoi(optarg);
            break;
        case 'J':
            J = atoi(optarg);
            break;
        case 'l':
            LIKE_MIN = atof(optarg);
            LOG_LIKE_MIN = log(LIKE_MIN);
            break;
        case 'M':
            M = atoi(optarg);
            break;
        case 'a':
            MIF_a = atof(optarg);
            break;
        case 'b':
            MIF_b = atof(optarg);
            break;
        case 'L':
            prop_L_option = atof(optarg);
            break;

        case 'S':
            SWITCH = atoi(optarg);
            break;

        case 'f':
            OPTION_IC_ONLY = 1;
            print_log("Fitting only the initial condition with fixed lag smoothing: **have** to be used with sfr -I !...\n");
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
            print_log("deter");
            COMMAND_DETER = 1;
        } else if (!strcmp(argv[0], "sto")) {
            COMMAND_STO = 1;
        } else {
            print_log(sfr_help_string);
            return 1;
        }
    }

#if FLAG_VERBOSE
    print_log("memory allocation and inputs loading...\n");
#endif

    struct s_mif *p_mif = build_mif(has_dt_be_specified, dt_option, prop_L_option);

#if FLAG_VERBOSE
    print_log("starting computations...\n");
#endif

     if (OPTION_PRIOR) {
        sanitize_best_to_prior(p_mif->p_best, p_mif->p_data);
    }


    //    transform_theta(p_mif->p_best, transit_mif, transit, 0);
    transform_theta(p_mif->p_best, transit_mif, NULL, p_mif->p_data, 0);
    get_submatrix_var_theta_mif(p_mif->var_theta, p_mif->p_best, p_mif->p_data);

    mif(p_mif->calc, p_mif->p_data, p_mif->p_best, &(p_mif->J_p_X), &(p_mif->J_p_X_tmp), p_mif->J_p_par, p_mif->p_like, p_mif->var_theta, p_mif->J_theta, p_mif->J_theta_tmp, &(p_mif->J_IC_grouped), &(p_mif->J_IC_grouped_tmp), p_mif->D_theta_bart, p_mif->D_theta_Vt);

#if FLAG_VERBOSE
    print_log("clean up...\n");
#endif

    clean_mif(p_mif);

    return 0;
}

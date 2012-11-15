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

int main(int argc, char *argv[])
{
    char ch;
    char str[STR_BUFFSIZE];

    char sfr_help_string[] =
        "Plom Kalman\n"
        "usage:\n"
        "kalman <command> [--traj] [-p, --path <path>] [-i, --id <integer>]\n"
        "                 [-b, --no_best] [-s, --DT <float>]  [--prior] [--transf]\n"
        "                 [--help]\n"
        "where command is 'deter' or 'sto'\n"
        "options:\n"
        "--traj             print the trajectories\n"
        "--prior            add log(prior) to the estimated loglik\n"
        "--transf           add log(JacobianDeterminant(transf)) to the estimated loglik. (combined to --prior, gives posterior density in transformed space)\n"
        "-p, --path         path where the outputs will be stored\n"
        "-b, --no_best      do not write best_<general_id>.output file\n"
        "-i, --id           general id (unique integer identifier that will be appended to the output files)\n"
        "-s, --DT           integration time step\n"
        "-l, --LIKE_MIN     particles with likelihood smaller that LIKE_MIN are considered lost\n"
        "--help             print the usage on stdout\n";

    // general options
    int has_dt_be_specified = 0;
    double dt_option;

    GENERAL_ID =0;
    snprintf(SFR_PATH, STR_BUFFSIZE, "%s", DEFAULT_PATH);
    LIKE_MIN = 1e-17;
    LOG_LIKE_MIN = log(LIKE_MIN);
    int output_best = 1;

    // options
    OPTION_TRAJ = 0;
    OPTION_PRIOR = 0;
    OPTION_TRANSF = 0;

    // commands
    COMMAND_DETER = 0;
    COMMAND_STO = 0;

    N_THREADS = 1; //not an option
    J = 1; //not an option, needed for print_X

    static struct option long_options[] = {
        {"help",       no_argument,       0, 'e'},
        {"path",       required_argument, 0, 'p'},
        {"id",         required_argument, 0, 'i'},
        {"no_best",    no_argument,       0, 'b'},

        {"traj", no_argument, &OPTION_TRAJ, 1},
        {"prior", no_argument, &OPTION_PRIOR, 1},
        {"transf", no_argument, &OPTION_TRANSF, 1},

        {"DT",         required_argument, 0, 's'},
        {"LIKE_MIN",   required_argument, 0, 'l'},

        {0, 0, 0, 0}
    };


    int option_index = 0;
    while ((ch = getopt_long (argc, argv, "i:l:s:p:b", long_options, &option_index)) != -1) {
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
        case 'b':
            output_best = 0;
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

    snprintf(str, STR_BUFFSIZE, "Starting Plom Kalman with the following options: i = %d, LIKE_MIN = %g DT = %g DELTA_STO = %g", GENERAL_ID, LIKE_MIN, DT, DELTA_STO );
    print_log(str);

#if FLAG_VERBOSE
    print_log("memory allocation and inputs loading...\n");
#endif

    struct s_kalman *p_kalman = build_kalman(root, OPTION_PRIOR);
    json_decref(root);

#if FLAG_VERBOSE
    print_log("starting computations...\n");
#endif

    transform_theta(p_kalman->p_best, NULL, NULL, p_kalman->p_data, 0);

#if FLAG_VERBOSE
    int64_t time_begin, time_end;
    time_begin = s_clock();
#endif

    back_transform_theta2par(p_kalman->p_par, p_kalman->p_best->mean, p_kalman->p_data->p_it_all, p_kalman->p_data);
    linearize_and_repeat(p_kalman->p_X, p_kalman->p_par, p_kalman->p_data, p_kalman->p_data->p_it_par_sv);
    prop2Xpop_size(p_kalman->p_X, p_kalman->p_data, COMMAND_STO);
    theta_driftIC2Xdrift(p_kalman->p_X, p_kalman->p_best->mean, p_kalman->p_data);

    FILE *p_file_X = NULL;
    if(OPTION_TRAJ) {
        p_file_X = sfr_fopen(SFR_PATH, GENERAL_ID, "X", "w", header_X, p_kalman->p_data);
    }

    double log_like = run_kalman(p_kalman->p_X, p_kalman->p_best, p_kalman->p_par, p_kalman->p_kal, p_kalman->p_common, p_kalman->p_data, p_kalman->calc, p_file_X, 0);

    if (OPTION_TRAJ) {
        sfr_fclose(p_file_X);
    }


#if FLAG_VERBOSE
    time_end = s_clock();
    struct s_duration t_exec = time_exec(time_begin, time_end);
    sprintf(str, "logV: %g\t computed in:= %dd %dh %dm %gs\n", log_like, t_exec.d, t_exec.h, t_exec.m, t_exec.s);
    print_log(str);
#endif

    if(output_best) {
        FILE *p_file_best = sfr_fopen(SFR_PATH, GENERAL_ID, "best", "w", header_best, p_kalman->p_data);
        print_best(p_file_best, 0, p_kalman->p_best, p_kalman->p_data, log_like);
        sfr_fclose(p_file_best);
    }

#if FLAG_VERBOSE
    print_log("clean up...\n");
#endif

    clean_kalman(p_kalman);

    return 0;
}

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

#include "simplex.h"

int main(int argc, char *argv[])
{
    char ch;
    char str[STR_BUFFSIZE];

    /* set default values for the options */

    char sfr_help_string[] =
        "Plom Simplex\n"
        "usage:\n"
        "simplex [-p, --path <path>] [-i, --id <integer>]\n"
        "        [-l, --LIKE_MIN <float>] [-S, --size <float>] [-M, --iter <integer>]\n"
        "        [--help]\n"
        "options:\n"
        "-s, --least_square   optimize the sum of square instead of the likelihood\n"
        "-p, --path           path where the outputs will be stored\n"
        "-i, --id             general id (unique integer identifier that will be appended to the output files)\n"
        "-l, --LIKE_MIN       likelihood smaller that LIKE_MIN are considered 0.0\n"
        "-M, --iter           maximum number of iterations\n"
        "-S, --size           simplex size used as a stopping criteria\n"
        "--help               print the usage on stdout\n";


    int M = 10;
    double CONVERGENCE_STOP_SIMPLEX = 1e-9;


    GENERAL_ID =0;
    snprintf(SFR_PATH, STR_BUFFSIZE, "%s", DEFAULT_PATH);
    J=1;
    LIKE_MIN = 1e-17;
    LOG_LIKE_MIN = log(1e-17);
    OPTION_LEAST_SQUARE = 0;
    N_THREADS = 1; //not an option


    while (1) {
        static struct option long_options[] =
            {
                /* These options don't set a flag We distinguish them by their indices (that are also the short option names). */
                {"help", no_argument,  0, 'e'},
                {"least_square", no_argument,  0, 's'},
                {"path",    required_argument, 0, 'p'},
                {"id",    required_argument, 0, 'i'},
                {"LIKE_MIN",     required_argument,   0, 'l'},
                {"iter",     required_argument,   0, 'M'},
                {"size",     required_argument,   0, 'S'},

                {0, 0, 0, 0}
            };
        /* getopt_long stores the option index here. */
        int option_index = 0;

        ch = getopt_long (argc, argv, "si:l:M:S:p:", long_options, &option_index);

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

        case 's':
            OPTION_LEAST_SQUARE = 1;
            break;

        case 'p':
            snprintf(SFR_PATH, STR_BUFFSIZE, "%s", optarg);
            break;
        case 'i':
            GENERAL_ID = atoi(optarg);
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

    sprintf(str, "Starting Plom-simplex with the following options: i = %d, LIKE_MIN = %g, M = %d, CONVERGENCE_STOP_SIMPLEX = %g", GENERAL_ID, LIKE_MIN, M, CONVERGENCE_STOP_SIMPLEX);
    print_log(str);

    struct s_simplex *p_simplex = build_simplex(GENERAL_ID);

    //transform_theta(p_simplex->p_best, transit, transit, 0);
    transform_theta(p_simplex->p_best, NULL, NULL, p_simplex->p_data, 0);

    if (M == 0) {
        //simply return the sum of square or the log likelihood (can be used to do slices especially with least square where smc can't be used'...)

        int k;
        p_simplex->p_best->n_to_be_estimated = p_simplex->p_best->length;
        for(k=0; k< p_simplex->p_best->n_to_be_estimated; k++){
            p_simplex->p_best->to_be_estimated[k] = k;
        }

        FILE *p_file_best = sfr_fopen(SFR_PATH, GENERAL_ID, "best", "w", header_best, p_simplex->p_data);
        print_best(p_file_best, 0, p_simplex->p_best, p_simplex->p_data, f_simplex(p_simplex->p_best->mean, p_simplex));
        sfr_fclose(p_file_best);
    } else {
        //run the simplex algo
        simplex(p_simplex->p_best, p_simplex->p_data, p_simplex, f_simplex, CONVERGENCE_STOP_SIMPLEX, M);
    }


#if FLAG_VERBOSE
    print_log("clean up...\n");
#endif

    clean_simplex(p_simplex);

    return 0;

}

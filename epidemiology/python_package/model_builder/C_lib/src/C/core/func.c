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


/**
 *  taken from zguide (zhelper.h)
 *  Return current system clock as milliseconds
 *
 *  int64_t t_s0 = s_clock();
 *  printf("dispatch: %" PRId64 "\n", s_clock()-t_s0);
 */

int64_t s_clock (void)
{

#if (defined (__WINDOWS__))
    SYSTEMTIME st;
    GetSystemTime (&st);
    return (int64_t) st.wSecond * 1000 + st.wMilliseconds;
#else
    struct timeval tv;
    gettimeofday (&tv, NULL);
    return (int64_t) (tv.tv_sec * 1000 + tv.tv_usec / 1000);
#endif
}


/**
 * returns the difference s1-s2 (in milliseconds) in days hours
 * minutes seconds where second is a double to account for milliseconds
 */
struct s_duration time_exec(int64_t s1, int64_t s2)
{
    struct s_duration t_exec;

    double duration = ((double) (s2 - s1) / 1000.0);
    t_exec.d = (unsigned int) floor(duration / 86400.0);    // nb of days
    duration -= t_exec.d * 86400.0;
    t_exec.h = (unsigned int) floor(duration / 3600.0);     // nb of hours
    duration -= t_exec.h * 3600.0;
    t_exec.m = (unsigned int) floor(duration / 60.0);       // nb of minutes
    t_exec.s = duration - t_exec.m * 60.0; // nb of seconds (double)

    return t_exec;
}


unsigned int sum1u(unsigned int *tab, int length_tab)
{
    int i;
    unsigned int res;
    res=0;

    for(i=0; i< length_tab ; i++)
        res+=tab[i];

    return res;
}

void online_mean_var(double *x, int N_x, double *mean, double *var)
{
    /*A numerically stable algorithm is given below. It also computes the mean. This algorithm is due to Knuth,[1] who cites Welford.[2]*/


    //def online_variance(data):
    //    n = 0
    //    mean = 0
    //    M2 = 0
    //
    //    for x in data:
    //        n = n + 1
    //        delta = x - mean
    //        mean = mean + delta/n
    //        M2 = M2 + delta*(x - mean)
    //
    //    variance_n = M2/n
    //    variance = M2/(n - 1)
    //    return (variance, variance_n)

    int k;
    double n=0.0;
    *mean=0.0;
    double M2=0.0;
    double delta;


    for(k=0;k<N_x;k++)
        {
            n = n + 1.0;
            delta = x[k] - *mean;
            *mean += delta/n;
            M2 += delta*(x[k] - *mean);

        }

    *var = M2/(n - 1.0);

}


int get_thread_id(void)
{
    int thread_id;

#if FLAG_PARALLEL
    thread_id=omp_get_thread_num();
#else
    thread_id=0;
#endif

    return thread_id;
}


/**
 *   return min of unsigned int tab
 */
int get_min_u(unsigned int *tab, int length_tab)
{

    int i;
    int min=tab[0];
    for (i=0 ; i<length_tab ;i++){
        if (tab[i]<min) {
            min=tab[i];
        }
    }
    return (min);
}

/**
 *  return max of unsigned int tab
 */
int get_max_u(unsigned int *tab, int length_tab)
{

    int i;
    int max=tab[0];
    for (i=0 ; i<length_tab ;i++){
        if (tab[i]>max){
            max=tab[i];
        }
    }
    return (max);
}


/**
 * when the user set jump_sizes to 0 on the webApp or release some
 * jump_sizes from 0 we need to recompute p_best->n_to_be_estimated
 * and p_best->to_be_estimated.
 */


void update_to_be_estimated(struct s_best *p_best)
{

    int k;

    p_best->n_to_be_estimated = 0;
    for(k=0; k<p_best->length; k++) {
        if(gsl_matrix_get(p_best->var, k, k) > 0.0) {
            p_best->to_be_estimated[ p_best->n_to_be_estimated ] = k;
            p_best->n_to_be_estimated++;
        } else {
            //be sure that 0.0 is a true zero!
            gsl_matrix_set(p_best->var, k, k, 0.0);
        }
    }

}


/**
 * make sure that N_THREADS <= J and return safe n_threads
 */

int sanitize_n_threads(int n_threads, int J)
{


    if(N_THREADS > J){
#if FLAG_VERBOSE
        print_warning("N_TREADS > J, N_THREADS has been set to J");
#endif
        return J;
    } else {
        return n_threads;
    }
}


void store_state_current_n_nn(struct s_calc **calc, int n, int nn)
{
    int nt;
    for (nt=0; nt<N_THREADS; nt++) {
        calc[nt]->current_n = n;
        calc[nt]->current_nn = nn;
    }
}



/**
 * if the prior are uniform, the parameters for which guess is outside
 * the range [min,max] are brought back within the ranges
 */
void sanitize_best_to_prior(struct s_best *p_best, struct s_data *p_data)
{

    struct s_router **routers = p_data->routers;
    int offset = 0;
    int i, k;

    for(i=0; i<(N_PAR_SV+N_PAR_PROC+N_PAR_OBS); i++) {
        for(k=0; k<routers[i]->n_gp; k++) {
            if ( (p_best->prior[k] == &pseudo_unif_prior) || (p_best->prior[k] == &gsl_ran_flat_pdf) ){
                double min = routers[i]->min[k];
                double max = routers[i]->max[k];
                if (gsl_vector_get(p_best->mean,offset)<min){
                    gsl_vector_set(p_best->mean,offset,min+0.01*(max-min));
                }
                if (gsl_vector_get(p_best->mean,offset)>max){
                    gsl_vector_set(p_best->mean,offset,max-0.01*(max-min));
                }
            }
            offset++;
        }
    }
}


/**
 * return 1 if i is in tab else 0
 */
int in_u(int i, unsigned int *tab, int length){
    int k;
    for (k=0 ; k< length; k++) {
        if (tab[k] == i) {
            return 1;
        }
    }

    return 0;
}

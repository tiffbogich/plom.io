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

double nextpow2(double x)
{
  /* returns the nearest upper power of 2 number */
  return pow(2, ceil(log(x)/log(2)));
}

void fourrier_power_spectrum(double *traj_obs_ts, int length_traj_obs_ts, int ts)
{
  char filename[255];
  sprintf(filename,"power_spectrum_%d", ts);
  FILE *fpower = sfr_fopen(SFR_PATH, GENERAL_ID, filename, "w", NULL, NULL);

  /*FFT of traj_obs_ts. Note that length_traj_obs_ts is power of 2
    gsl_fft_real_radix2_transform computes an in-place transform which means that raj_obs_ts is overwritten
  */

  int k;
  double *fft = traj_obs_ts; //for clarity

  gsl_fft_real_radix2_transform(traj_obs_ts, 1, length_traj_obs_ts); //1 is stride

  /* the fft is symmetric so we work only on the first unique (1+length/2) points */

  //take the magnitude of the fft and multiply by 2 to compensate that we work on only half the signal
  //DC and Nyquist component are unique so we do not multipy by 2
  fft[0] = pow(fabs(fft[0]),2);
  fft[length_traj_obs_ts/2] = pow(fabs(fft[length_traj_obs_ts/2]),2);
  for(k=1; k< (length_traj_obs_ts/2); k++) //Note that we start at 1 and stop before length_traj_obs_ts/2 to discardDC and Nyquist comp
    fft[k] = (fft[k]*fft[k] +fft[length_traj_obs_ts-k]*fft[length_traj_obs_ts-k])*2;

  /* link components to frequencies (see GSL doc for details):
     index  frequency
     0      0
     1      1/(length * DT_PRINT)
     2      2/(length * DT_PRINT)
     ...
     length/2  1/(2*DT_PRINT)
  */

  for(k=0; k< (1+length_traj_obs_ts/2); k++)
    fprintf(fpower, "%g\t%g\n", ((double) k) /(((double) length_traj_obs_ts)), fft[k]);

  sfr_fclose(fpower);
}


void period_dynamical_system(double *traj_obs_ts, int length_traj_obs_ts, int ts)
{
    /*
      period analysis (using dynamical system point of view)
    */

    double err;
    int period_in_time_step;
    int i;

    char filename[255];
    sprintf(filename,"period_%d", ts);
    FILE *fperiod = sfr_fopen(SFR_PATH, GENERAL_ID, filename, "w", NULL, NULL);

    for(i=0; i<10; i++) {
        period_in_time_step = (int) round(ONE_YEAR_IN_DATA_UNIT*(i+1));
        err = period(traj_obs_ts, period_in_time_step, length_traj_obs_ts);
        fprintf(fperiod, "%g\n", err);
    }

    fclose(fperiod);

}


double period(double *traj_obs_ts, int period, int length_traj_obs_ts)
{

/*
  period of attractor
  return biggest difference between |log(I(t+p)-log(I)|
*/

  double err=0.0;
  double err_temp;
  int i;

  for(i=0; i<(length_traj_obs_ts-period); i++) {
      err_temp=fabs(log(traj_obs_ts[i+period])-log(traj_obs_ts[i]));
      if( err_temp > err) {
          err=err_temp;
      }
  }
  return err;
}



void max_min(double *traj_obs_ts, struct s_par *p_par, struct s_data *p_data, struct s_calc *p_calc, double t0, int length_traj_obs_ts, int ts)
{
  /* print max and min of traj_obs_ts */

  char filename[255];
  sprintf(filename,"min_%d", ts);
  FILE *fmin = sfr_fopen(SFR_PATH, GENERAL_ID, filename, "w", NULL, NULL);
  sprintf(filename,"max_%d", ts);
  FILE *fmax = sfr_fopen(SFR_PATH, GENERAL_ID, filename, "w", NULL, NULL);

  int i, k;
  double traj_min, traj_max, t_min, t_max;
  double max, min;

  double bloc[N_BLOC];

  //fixed point ?
  traj_min = get_min(traj_obs_ts, length_traj_obs_ts);
  traj_max = get_max(traj_obs_ts, length_traj_obs_ts);
  if(fabs(traj_max - traj_min) < PRECISION)
    {
      fprintf(fmin, "%g\tNaN\n", (traj_min+traj_max)/ ((double) 2.0));
      fprintf(fmax, "%g\tNaN\n",  (traj_min+traj_max)/ ((double) 2.0));
    }
  else //there is an extrema
    {
      for(i=0;  i < (length_traj_obs_ts-N_BLOC) ; i++)
        {
          for (k=0 ; k<N_BLOC ; k++)
            bloc[k]=traj_obs_ts[i+k]; //can be optimized to copy less

          max = b_max(bloc, N_BLOC);
          if(max > -10.0) //there is a max in bloc
            {
              t_max=(i+1+(N_BLOC-1)/2);
              fprintf(fmax, "%g\t%g\n", obs_mean(max, p_par, p_data, p_calc, ts), t0+ t_max);
            }

          min = b_min(bloc, N_BLOC);
          if(min > -10.0) //there is a min in bloc
            {
              t_min=(i+1+(N_BLOC-1)/2);
              fprintf(fmin, "%g\t%g\n", obs_mean(min, p_par, p_data, p_calc, ts), t0+ t_min);
            }
        }
    }

  sfr_fclose(fmin);
  sfr_fclose(fmax);
}



double b_max(double *bloc, int length_bloc)
{
  /*
     is the central element of bloc a minima ?
     yes : -> return it
     no: ->return -100.0

     Note that we add a check to discard min that are not not significantly smaller that max(bloc).
  */

  int i;
  double min,max;
  max = bloc[(length_bloc-1)/2];
  min=get_min(bloc, length_bloc);

  if(fabs(max - min) < PRECISION)
    {
      max=-100.0;
      return max;
    }

  for (i=1 ; i<=(length_bloc-1)/2 ; i++)
    {
      if ( (bloc[(length_bloc-1)/2-i]>=max) || (bloc[(length_bloc-1)/2+i]>max)  )
        {
          max=-100.0;
          return max;
        }
    }

  return max;
}



double b_min(double *bloc, int length_bloc)
{
  /*
     is the central element of bloc a maxima ?
     yes : -> return it
     no: ->return -100.0

     Note that we add a check to discard max that are not not significantly higher that min(bloc).
  */

  int i;
  double min,max;
  min = bloc[(length_bloc-1)/2];
  max=get_max(bloc, length_bloc);

  if(fabs(max - min) < PRECISION)
    {
      min=-100.0;
      return min;
    }

  for (i=1 ; i<=(length_bloc-1)/2 ; i++)
    {
      if ( (bloc[(length_bloc-1)/2-i]<=min) || (bloc[(length_bloc-1)/2+i]<min)  )
        {
          min=-100.0;
          return min;
        }
    }

  return min;
}


double get_min(double *tab, int length_tab)
{
  /* return min of tab */

  int i;
  double min=tab[0];
  for (i=0 ; i<length_tab ;i++){
    if (tab[i]<min) {
      min=tab[i];
    }
  }
  return (min);
}


double get_max(double *tab, int length_tab)
{
  /* return max of tab */

  int i;
  double max=tab[0];
  for (i=0 ; i<length_tab ;i++){
    if (tab[i]>max){
      max=tab[i];
    }
  }
  return (max);
}

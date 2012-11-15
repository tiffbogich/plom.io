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

double terms_forcing(double amplitude, double time, struct s_data *p_data, int cac)
{
  /*time is in the same unit as data, !!! school terms are in year !!! */

  double s_t;
  int k;

  int isholliday=0;
  double time_in_year = time / ONE_YEAR_IN_DATA_UNIT;
  double part_year = time_in_year - floor(time_in_year);

  for(k=0; k< p_data->n_terms[cac] ; k++) {
      if( ((part_year >= p_data->school_terms[cac][k][0]) && (part_year <= p_data->school_terms[cac][k][1])) ) {
	  isholliday=1;
	  break;
      }
  }

  if (isholliday) { //holidays
      s_t = amplitude/(1.0+amplitude*(1.0-p_data->prop_school[cac]));
  } else { //schools are in
      s_t = 1.0/(1.0+amplitude*(1.0-p_data->prop_school[cac]));
  }
  
  return s_t;
}

double sinusoidal_forcing(double amplitude, double dephasing, double time)
{
  /*time is in the same unit as data!*/
  return (1.0+ amplitude*sin(2.0*M_PI*( time/ (ONE_YEAR_IN_DATA_UNIT) )+dephasing*2.0*M_PI ));
}


double step(double mul, double t_intervention, double time)
{
  /*time is in the same unit as data!*/
  return (time < t_intervention) ? 1.0 : mul;
}


double step_lin(double mul, double t_intervention, double time)
{
  /*time is in the same unit as data!*/

  double res_step;

  if(time < t_intervention)
    {
      res_step = 1.0;
    }
  else
    {
      res_step = 1.0 + mul*(time-t_intervention) ;
      res_step = (res_step > 0.0) ? res_step : 0.0 ;
    }

  return res_step;
}



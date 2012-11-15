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

struct s_simplex *build_simplex(int general_id)
{
  struct s_simplex *p_simplex;
  p_simplex = malloc(sizeof(struct s_simplex));
  if(p_simplex==NULL) {
        char str[STR_BUFFSIZE];
        sprintf(str, "Allocation impossible in file :%s line : %d",__FILE__,__LINE__);
        print_err(str);
        exit(EXIT_FAILURE);
    }

  json_t *root = load_json();
  load_const(root);
  p_simplex->p_data = build_data(root, 0); //also build obs2ts
  p_simplex->calc = build_calc(general_id, N_PAR_SV*N_CAC +N_TS_INC_UNIQUE, func, p_simplex->p_data);
  p_simplex->p_par = build_par(p_simplex->p_data);
  p_simplex->p_X = build_X(p_simplex->p_data);
  p_simplex->p_best = build_best(p_simplex->p_data, root);
  json_decref(root);

  p_simplex->smallest_log_like = get_smallest_log_likelihood(p_simplex->p_data->data_ind);

  return p_simplex;
}


void clean_simplex(struct s_simplex *p_simplex)
{

  clean_calc(p_simplex->calc);
  clean_X(p_simplex->p_X);
  clean_best(p_simplex->p_best);
  clean_par(p_simplex->p_par);
  clean_data(p_simplex->p_data);

  FREE(p_simplex);
}

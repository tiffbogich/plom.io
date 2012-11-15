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
 * return c and ac from cac=c*N_AC +ac
 * @param[in] cac the aggragated cac
 * @param[out] c the c index
 * @param[out] ac the ac index
 */
void get_c_ac(int cac, int *c, int *ac)
{
  *c = cac/ N_AC;
  *ac = cac % N_AC;
}

/**
 * return the composition (nb of element and element id) of the groups
 * contained in p_router
 */
struct s_group **get_groups_compo(struct s_router *p_router)
{

  int g; //group
  int k; //element id

  struct s_group **compo = malloc(p_router->n_gp * sizeof (struct s_group *));
  if(compo==NULL)
    {
      fprintf(stderr,"Allocation impossible in file :%s line : %d",__FILE__,__LINE__);
      exit(EXIT_FAILURE);
    }

  for(g=0; g< p_router->n_gp; g++)
    {
      compo[g] = malloc(sizeof (struct s_group));
      if(compo[g]==NULL)
        {
          fprintf(stderr,"Allocation impossible in file :%s line : %d",__FILE__,__LINE__);
          exit(EXIT_FAILURE);
        }

      compo[g]->size = 0;
      for(k=0; k< p_router->p; k++) //p is the max number of element of a group
        {
          if(p_router->map[k] == g) //k is in an element of the goup g
            {
              compo[g]->size += 1;
              if(compo[g]->size == 1)
                compo[g]->elements = init1u_set0(1);
              else
                {
                  unsigned int *tmp;
                  tmp = realloc(compo[g]->elements, compo[g]->size * sizeof(unsigned int) );
                  if ( tmp == NULL )
                    {
                      fprintf(stderr,"Reallocation impossible");
                      FREE(compo[g]->elements);
                      exit(EXIT_FAILURE);
                    }
                  else
                    compo[g]->elements = tmp;
                }
              compo[g]->elements[compo[g]->size-1] = k;
            }
        }
    }

  return compo;
}

void clean_groups_compo(struct s_group **compo, int n_gp)
{
  int g;
  for(g=0; g< n_gp; g++)
    {
      FREE(compo[g]->elements);
      FREE(compo[g]);
    }
  FREE(compo);
}

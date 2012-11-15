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



size_t *init1st_set0(int n)
{
    int i;
    size_t *tab = malloc(n*sizeof (size_t));

    if(tab==NULL) {
        fprintf(stderr,"Allocation impossible in file :%s line : %d",__FILE__,__LINE__);
        exit(EXIT_FAILURE);
    }

    for(i=0;i<n;i++) {
        tab[i]=0;
    }

    return tab;
}


size_t **init2st_set0(int n, int p)
{
    int i;
    size_t **tab = malloc(n* sizeof (size_t *));

    if(tab==NULL) {
        char str[STR_BUFFSIZE];
        sprintf(str, "Allocation impossible in file :%s line : %d",__FILE__,__LINE__);
        print_err(str);
        exit(EXIT_FAILURE);
    }

    for(i=0;i<n;i++) {
        tab[i] = init1st_set0(p);
    }

    return tab;
}

void clean2st(size_t **tab, int n)
{
    int i;
    for(i=0; i<n; i++){
        FREE(tab[i]);
    }

    FREE(tab);
}

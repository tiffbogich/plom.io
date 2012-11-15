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


/* this file is automaticaly generated from init_d.c */

unsigned int *init1u_set0(int n)
{
    int i;
    unsigned int *tab = malloc(n*sizeof (unsigned int));

    if(tab==NULL)
    {
	char str[STR_BUFFSIZE];
	sprintf(str, "Allocation impossible in file :%s line : %d",__FILE__,__LINE__);	
	print_err(str);
	exit(EXIT_FAILURE);
    }

    for(i=0;i<n;i++)
	tab[i]=0.0;

    return tab;  
}

unsigned int **init2u_set0(int n, int p)
{
    int i;
    unsigned int **tab = malloc(n* sizeof (unsigned int *));

    if(tab==NULL)
    {
	char str[STR_BUFFSIZE];
	sprintf(str, "Allocation impossible in file :%s line : %d",__FILE__,__LINE__);	
	print_err(str);
	exit(EXIT_FAILURE);
    }

    for(i=0;i<n;i++)
	tab[i] = init1u_set0(p);
  
    return tab;
}

void clean2u(unsigned int **tab, int n)
{
    int i;
    for(i=0; i<n; i++)
	FREE(tab[i]);

    FREE(tab);  
}

unsigned int ***init3u_set0(int n, int p1, int p2)
{
    int i;
    unsigned int ***tab = malloc(n* sizeof (unsigned int **));

    if(tab==NULL)
    {
	char str[STR_BUFFSIZE];
	sprintf(str, "Allocation impossible in file :%s line : %d",__FILE__,__LINE__);	
	print_err(str);
	exit(EXIT_FAILURE);
    }

    for(i=0;i<n;i++)
	tab[i] = init2u_set0(p1, p2);

    return tab;  
}

void clean3u(unsigned int ***tab, int n, int p1)
{
    int i, j;

    for(i=0; i<n; i++)
	for(j=0; j<p1; j++)
	    FREE(tab[i][j]);

    for(i=0; i<n; i++)
	FREE(tab[i]);
    FREE(tab);
}

unsigned int ****init4u_set0(int n, int p1, int p2, int p3)
{
    int i;
    unsigned int ****tab = malloc(n* sizeof (unsigned int ***));

    if(tab==NULL)
    {
	char str[STR_BUFFSIZE];
	sprintf(str, "Allocation impossible in file :%s line : %d",__FILE__,__LINE__);	
	print_err(str);
	exit(EXIT_FAILURE);
    }

    for(i=0;i<n;i++)
	tab[i] = init3u_set0(p1, p2, p3);

    return tab;
}

void clean4u(unsigned int ****tab, int n, int p1, int p2)
{
    int i, j, k;

    for(i=0; i<n; i++)
	for(j=0; j<p1; j++)
	    for(k=0; k<p2; k++)
		FREE(tab[i][j][k]);

    for(i=0; i<n; i++)
	for(j=0; j<p1; j++)
	    FREE(tab[i][j]);

    for(i=0; i<n; i++)
	FREE(tab[i]);

    FREE(tab);
}

unsigned int **init2u_var_set0(int n, unsigned int *p)
{
    int i;

    unsigned int **tab=malloc(n* sizeof (unsigned int *));
    if(tab==NULL)
    {
	char str[STR_BUFFSIZE];
	sprintf(str, "Allocation impossible in file :%s line : %d",__FILE__,__LINE__);	
	print_err(str);
	exit(EXIT_FAILURE);
    }

    for(i=0;i<n;i++)
	tab[i] = init1u_set0(p[i]);

    return tab;
}


unsigned int ***init3u_var_set0(int n, unsigned int *p1, unsigned int **p2)
{
    int i;

    unsigned int ***tab = malloc(n* sizeof (unsigned int **));
    if(tab==NULL)
    {
	char str[STR_BUFFSIZE];
	sprintf(str, "Allocation impossible in file :%s line : %d",__FILE__,__LINE__);	
	print_err(str);
	exit(EXIT_FAILURE);
    }

    for(i=0;i<n;i++)
	tab[i]= init2u_var_set0(p1[i], p2[i]);

    return tab;
}


void clean3u_var(unsigned int ***tab, int n, unsigned int *p1)
{
    int i, j;

    for(i=0; i<n; i++)
	for(j=0; j<p1[i]; j++)
	    FREE(tab[i][j]);

    for(i=0; i<n; i++)
	FREE(tab[i]);

    FREE(tab);
}


unsigned int ***init3u_varp1_set0(int n, unsigned int *p1, int p2)
{
    int i,j;

    unsigned int ***tab = malloc(n* sizeof (unsigned int **));
    if(tab==NULL)
    {
	char str[STR_BUFFSIZE];
	sprintf(str, "Allocation impossible in file :%s line : %d",__FILE__,__LINE__);	
	print_err(str);
	exit(EXIT_FAILURE);
    }

    for(i=0;i<n;i++)
    {
	tab[i]= malloc(p1[i]* sizeof (unsigned int *));
	if(tab[i]==NULL)
	{
	    char str[STR_BUFFSIZE];
	    sprintf(str, "Allocation impossible in file :%s line : %d",__FILE__,__LINE__);	
	    print_err(str);
	    exit(EXIT_FAILURE);
	}
    }

    for(i=0;i<n;i++)
	for(j=0;j<p1[i];j++)
	    tab[i][j]= init1u_set0(p2);

    return tab;
}


unsigned int ***init3u_varp2_set0(int n, unsigned int p1, unsigned int *p2)
{
    int i,j;

    unsigned int ***tab = malloc(n* sizeof (unsigned int **));
    if(tab==NULL)
    {
	char str[STR_BUFFSIZE];
	sprintf(str, "Allocation impossible in file :%s line : %d",__FILE__,__LINE__);	
	print_err(str);
	exit(EXIT_FAILURE);
    }

    for(i=0;i<n;i++)
    {
	tab[i] = malloc(p1* sizeof (unsigned int *));
	if(tab[i]==NULL)
	{
	    char str[STR_BUFFSIZE];
	    sprintf(str, "Allocation impossible in file :%s line : %d",__FILE__,__LINE__);	
	    print_err(str);
	    exit(EXIT_FAILURE);
	}
    }

    for(i=0;i<n;i++)
	for(j=0;j<p1;j++)
	    tab[i][j]= init1u_set0(p2[i]);

    return tab;  
}



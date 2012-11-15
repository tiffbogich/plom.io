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


unsigned int n2d(char *filename, int Np)
{
  /*return number of lines of filename */
  int n,p;
  n=1;
  p=0;
  double tmp=0.0;
  FILE* myfile = NULL;
  myfile = fopen(filename, "r");

  if( myfile != NULL )
    {
      while( (fscanf(myfile,"%lf",&tmp)!=EOF) )
        {
          if(p<Np)
            {
              p++;
            }
          else
            {
              n++;
              p=0;
              p++;
            }
        }
      fclose(myfile);
      myfile=NULL;
    }
  else
    {
      fprintf(stderr, "failed to read %s, the program will now quit\n", filename);
      exit(EXIT_FAILURE);
    }

  return n;
}

unsigned int n2d_nan(char *filename, int Np)
{
  /*return number of lines of filename allowing possible NaN in the file */
  int n,p;
  n=1;
  p=0;
  char tmp[255];
  FILE* myfile = NULL;
  myfile = fopen(filename, "r");

  if( myfile != NULL )
    {
      while( (fscanf(myfile,"%s",tmp)!=EOF) )
        {
          if(p<Np)
            {
              p++;
            }
          else
            {
              n++;
              p=0;
              p++;
            }
        }
      fclose(myfile);
      myfile=NULL;
    }
  else
    {
      fprintf(stderr, "failed to read %s, the program will now quit\n", filename);
      exit(EXIT_FAILURE);
    }

  return n;
}



void load1u(unsigned int *tab, char *filename)
{
  int i;
  unsigned int tmp=0;

  FILE* myfile = NULL;

  i=0;
  myfile = fopen(filename, "r");
  if (myfile != NULL)
    {
      while(fscanf(myfile,"%u",&tmp)!=EOF)
        {
          tab[i++]=tmp;
        }
      fclose(myfile);
      myfile=NULL;
    }
  else
    {
      fprintf(stderr, "failed to read %s\n", filename);
    }
}


void load1d(double *tab, char *filename)
{
  int i;
  double tmp=0.0;

  FILE* myfile = NULL;

  i=0;
  myfile = fopen(filename, "r");
  if (myfile != NULL)
    {
      while(fscanf(myfile,"%lf",&tmp)!=EOF)
        {
          tab[i++]=tmp;
        }
      fclose(myfile);
      myfile=NULL;
    }
  else
    {
      fprintf(stderr, "failed to read %s\n", filename);
    }

}


void load2u(unsigned int **tab, char *filename, int Np)
{
  int n,p;
  n=0;
  p=0;
  unsigned int tmp=0;

  FILE* myfile = NULL;
  myfile = fopen(filename, "r");

  if( myfile != NULL )
    {
      while( (fscanf(myfile,"%d",&tmp)!=EOF) )
        {
          if(p<Np)
            {
              tab[n][p++]=tmp;
            }
          else
            {
              n++;
              p=0;
              tab[n][p++]=tmp;
            }
        }
      fclose(myfile);
      myfile=NULL;
    }
  else
    {
      fprintf(stderr, "failed to read %s\n", filename);
    }
}


void load2d(double **tab, char *filename, int Np)
{

  int n,p;
  n=0;
  p=0;
  double tmp=0.0;
  FILE* myfile = NULL;
  myfile = fopen(filename, "r");

  if( myfile != NULL )
    {
      while( (fscanf(myfile,"%lf",&tmp)!=EOF) )
        {
          if(p<Np)
            {
              tab[n][p++]=tmp;
            }
          else
            {
              n++;
              p=0;
              tab[n][p++]=tmp;
            }
        }
      fclose(myfile);
      myfile=NULL;
    }
  else
    {
      fprintf(stderr, "failed to read %s\n", filename);
    }
}



void load2d_nan(double **tab, char *filename, int Np)
{
  int n,p;
  n=0;
  p=0;

  char tmp[255];
  char *end;

  FILE* myfile = NULL;
  myfile = fopen(filename, "r");

  if( myfile != NULL )
    {
      while( (fscanf(myfile,"%s", tmp)!=EOF) )
        {
          if(p<Np)
            {
              tab[n][p++]=strtod(tmp, &end);
            }
          else
            {
              n++;
              p=0;
              tab[n][p++]=strtod(tmp, &end);
            }
        }
      fclose(myfile);
      myfile=NULL;
    }
  else
    {
      fprintf(stderr, "failed to read %s\n", filename);
    }

}



void load2u_var(unsigned int **tab, char *filename, unsigned int *Np)
{
  int n,p;
  n=0;
  p=0;
  unsigned int tmp=0;
  FILE* myfile = NULL;
  myfile = fopen(filename, "r");

  if( myfile != NULL )
    {
      while( (fscanf(myfile,"%d",&tmp)!=EOF) )
        {
          if(p<Np[n])
            {
              tab[n][p++]=tmp;
            }
          else
            {
              n++;
              p=0;
              tab[n][p++]=tmp;
            }
        }
      fclose(myfile);
      myfile=NULL;
    }
  else
    {
      fprintf(stderr, "failed to read %s\n", filename);
    }

}




void load3d_var(double ***tab, int n, unsigned int *colbreaks1, unsigned int **colbreaks2, char *filename)
{
  /*we have to divided lines into different sections*/

  FILE* myfile =NULL;
  myfile=fopen(filename, "r");

  /*nesting: (i|c|ac) i encompass c that encompass ac*/
  int i=0;
  int c=0;
  int ac=0;
  int column=0;
  double temp;

  unsigned int *column_size = init1u_set0(n);

  for(i=0;i<n;i++)
    {
      column_size[i]=0;
      for(c=0;c<colbreaks1[i];c++)
        {
          column_size[i]+=colbreaks2[i][c];
        }
    }

  i=0;
  c=0;
  ac=0;

  if(myfile != NULL)
    {
      while(fscanf(myfile,"%lf",&temp)!=EOF)
        {
          if(column<column_size[i])
            {
              column++;
              if(ac<colbreaks2[i][c])
                {
                  tab[i][c][ac++]=temp;
                }
              else
                {
                  ac=0;
                  tab[i][++c][ac++]=temp;
                }
            }
          else
            {
              column=1;
              ac=0;
              c=0;
              tab[++i][c][ac++]=temp;
            }
        }/*fin du while*/

      fclose(myfile);
      myfile=NULL;
    }
  else
    {
      fprintf(stderr, "failed to read %s\n", filename);
    }

  FREE(column_size);
}


void load3u_var(unsigned int ***tab, int n, unsigned int *colbreaks1, unsigned int **colbreaks2, char *filename)
{
  /*we have to divided lines into different sections*/
  FILE* myfile =NULL;
  myfile=fopen(filename, "r");
  /*nesting: (i|c|ac) i encompass c that encompass ac*/
  int i=0;
  int c=0;
  int ac=0;
  int column=0;
  unsigned int temp;

  unsigned int *column_size = init1u_set0(n);

  for(i=0;i<n;i++)
    {
      column_size[i]=0;
      for(c=0;c<colbreaks1[i];c++)
        {
          column_size[i]+=colbreaks2[i][c];
        }
    }

  i=0;
  c=0;
  ac=0;

  if(myfile != NULL)
    {
      while(fscanf(myfile,"%d",&temp)!=EOF)
        {
          if(column<column_size[i])
            {
              column++;
              if(ac<colbreaks2[i][c])
                {
                  tab[i][c][ac++]=temp;
                }
              else
                {
                  ac=0;
                  tab[i][++c][ac++]=temp;
                }
            }
          else
            {
              column=1;
              ac=0;
              c=0;
              tab[++i][c][ac++]=temp;
            }
        }/*fin du while*/

      fclose(myfile);
      myfile=NULL;
    }
  else
    {
      fprintf(stderr, "failed to read %s\n", filename);
    }

  FREE(column_size);
}


void load3u_varp1(unsigned int ***tab, int n, unsigned int *colbreaks1, unsigned int colbreaks2, char *filename)
{
  int i, j;

  unsigned int **temp = init2u_var_set0(n, colbreaks1); /*we want to use load3u_var() so we crete a temporary array*/

  for(i=0; i<n; i++)
    for(j=0; j<colbreaks1[i]; j++)
      temp[i][j]=colbreaks2;

  load3u_var(tab, n, colbreaks1, temp, filename);

  clean2u(temp, n);
}


void load_const(json_t *root)
{
  /*load constants defined as global variable*/

#if FLAG_VERBOSE
  print_log("load Simforence constants...");
#endif

  POP_SIZE_EQ_SUM_SV = fast_get_json_boolean(root, "POP_SIZE_EQ_SUM_SV");

  json_t *cst = fast_get_json_object(root, "cst");

  /*dimensions parameters*/
  N_C = fast_get_json_integer(cst, "N_C");
  N_AC = fast_get_json_integer(cst, "N_AC");
  N_CAC = N_C*N_AC;
  N_PAR_PROC = fast_get_json_integer(cst, "N_PAR_PROC");
  N_PAR_OBS = fast_get_json_integer(cst, "N_PAR_OBS");
  N_PAR_SV = fast_get_json_integer(cst, "N_PAR_SV");
  N_PAR_FIXED = fast_get_json_integer(cst, "N_PAR_FIXED");
  N_TS = fast_get_json_integer(cst, "N_TS");
  N_TS_INC = fast_get_json_integer(cst, "N_TS_INC");
  N_TS_INC_UNIQUE = fast_get_json_integer(cst, "N_TS_INC_UNIQUE");
  N_DATA = fast_get_json_integer(cst, "N_DATA");
  N_DATA_PAR_FIXED = fast_get_json_integer(cst, "N_DATA_PAR_FIXED");
  //N_DATA_NONAN is computed and assigned in build_data
  N_OBS_ALL = fast_get_json_integer(cst, "N_OBS_ALL");
  N_OBS_INC = fast_get_json_integer(cst, "N_OBS_INC");
  N_OBS_PREV = fast_get_json_integer(cst, "N_OBS_PREV");

  N_DRIFT_PAR_PROC = fast_get_json_integer(cst, "N_DRIFT_PAR_PROC");
  N_DRIFT_PAR_OBS = fast_get_json_integer(cst, "N_DRIFT_PAR_OBS");

  IS_SCHOOL_TERMS = fast_get_json_integer(cst, "IS_SCHOOL_TERMS");

  /*numerical integration parameters*/
  DELTA_STO = fast_get_json_real(cst, "DELTA_STO");
  DT = 1.0 / DELTA_STO;
  ONE_YEAR_IN_DATA_UNIT = fast_get_json_real(cst, "ONE_YEAR_IN_DATA_UNIT");
}


void load_best(struct s_best *p_best, json_t *root, int update_guess)
{
    /* integrate best data from the webApp */

    int i, j, g, offset;
    json_t *parameters = fast_get_json_object(root, "parameters");
    json_t *partitions = fast_get_json_object(root, "partition");
    json_t *orders = fast_get_json_object(root, "orders");

    const char par_types[][10] = { "par_sv", "par_proc", "par_obs" };

    offset = 0;
    for(i=0; i<3; i++) {
        json_t *my_par_list = fast_get_json_array(orders, par_types[i]);

        for(j=0; j< json_array_size(my_par_list); j++) {

            const char *par_key = fast_get_json_string_from_array(my_par_list, j, par_types[i]);
            json_t *par = fast_get_json_object(parameters, par_key);
            const char *partition_key = fast_get_json_string_from_object(par, "partition_id");
            json_t *my_partitition = fast_get_json_object(partitions, partition_key);
            json_t *groups = fast_get_json_array(my_partitition, "group");

            json_t *par_min = fast_get_json_object(par, "min");
            json_t *par_max = fast_get_json_object(par, "max");
            json_t *par_sd_transf = fast_get_json_object(par, "sd_transf");
            json_t *par_guess = fast_get_json_object(par, "guess");

            const char *prior = fast_get_json_string_from_object(par, "prior");

            for (g=0; g < json_array_size(groups); g++) { //for each group
                json_t *my_group = json_array_get(groups, g);
                const char *my_group_id = fast_get_json_string_from_object(my_group, "id");

                if (strcmp(prior, "normal") == 0) {
                    p_best->prior[offset] = &normal_prior;
                } else {
                    //p_best->prior[offset] = &gsl_ran_flat_pdf;
                    p_best->prior[offset] = &pseudo_unif_prior;
                }

                if (update_guess) {
                    gsl_vector_set(p_best->mean, offset, fast_get_json_real_from_object(par_guess, my_group_id));
                }
                gsl_matrix_set(p_best->var, offset, offset, fast_get_json_real_from_object(par_sd_transf, my_group_id));

                p_best->par_prior[offset][0] = fast_get_json_real_from_object(par_min, my_group_id);
                p_best->par_prior[offset][1] = fast_get_json_real_from_object(par_max, my_group_id);

                offset++;
            }
        }
    }
}



void load_covariance(gsl_matrix *covariance, json_t *array2d)
{
    char str[STR_BUFFSIZE];
    int i, k;

    for (i=0; i< json_array_size(array2d); i++) {
        json_t *array_i;
        array_i = json_array_get(array2d, i);
        if (!json_is_array(array_i)) {
            sprintf(str, "error: covariance[%d] is not an array\n", i);
            print_err(str);

            exit(EXIT_FAILURE);
        }

        for (k=0; k< json_array_size(array_i); k++) {
            json_t *value_ik;
            value_ik = json_array_get(array_i, k);

            if (json_is_number(value_ik)) {
                gsl_matrix_set(covariance, i, k, json_number_value(value_ik));
            } else {
                sprintf(str, "error: covariance[%d][%d] is not a number\n", i, k);
                print_err(str);
                exit(EXIT_FAILURE);
            }
        }
    }
}

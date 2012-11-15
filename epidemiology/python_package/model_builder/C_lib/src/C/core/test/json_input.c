//gcc -Wall json_input.c -lm -ljansson && ./a.out< tutorial.json 

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <jansson.h>

#define BUFFER_SIZE (5000 * 1024)  /* 5000 KB */

json_t *fast_get_json_object(json_t *container, char *obj_name)
{
  json_t *object;
  object = json_object_get(container, obj_name);
  if(!json_is_object(object))
    {
      fprintf(stderr, "error: %s is not an object\n", obj_name);
      exit(EXIT_FAILURE);
    }

  return object;  
}


json_t *fast_get_json_array(json_t *container, char *array_name)
{
  json_t *array;
  array = json_object_get(container, array_name);
  if(!json_is_array(array))
    {
      fprintf(stderr, "error: %s is not an array\n", array_name);
      exit(EXIT_FAILURE);
    }

  return array;  
}



int fast_get_json_integer(json_t *container, char *obj_name)
{
  json_t *tmp;
  tmp = json_object_get(container, obj_name);
  if(!json_is_integer(tmp))
    {
      fprintf(stderr, "error: %s is not an integer\n", obj_name);
      exit(EXIT_FAILURE);
    }

  return (int) json_integer_value(tmp);  
};



double fast_get_json_double(json_t *container, char *obj_name)
{
  json_t *tmp;
  tmp = json_object_get(container, obj_name);
  if(!json_is_real(tmp))
    {      
      fprintf(stderr, "error: %s is not an integer\n", obj_name);
      exit(EXIT_FAILURE);
    }

  return json_real_value(tmp);  
};




















unsigned int *fast_load_fill_json_1u(json_t *array, char *array_name)
{
  int i;
  unsigned int *tab = malloc(json_array_size(array) * sizeof(unsigned int));  
  if(tab==NULL)
    {
      fprintf(stderr,"Allocation impossible in file :%s line : %d",__FILE__,__LINE__);
      exit(EXIT_FAILURE);
    }

  for(i=0; i< json_array_size(array); i++)
    {
      json_t *array_i;      
      array_i = json_array_get(array, i);

      if(!json_is_integer(array_i))
	{
	  fprintf(stderr, "error: %s[%d] is not an integer\n", array_name, i);
	  exit(EXIT_FAILURE);
	}
      tab[i] = json_integer_value(array_i);
      
    }

  return tab;
  
};

unsigned int **fast_load_fill_json_2u(json_t *array, char *array_name)
{
  int i;
  char array_name_i[255];  

  unsigned int **tab = malloc(json_array_size(array) * sizeof(unsigned int *));  
  if(tab==NULL)
    {
      fprintf(stderr,"Allocation impossible in file :%s line : %d",__FILE__,__LINE__);
      exit(EXIT_FAILURE);
    }

  
  for(i=0; i< json_array_size(array); i++)
    {
      json_t *array_i;      
      array_i = json_array_get(array, i);
      if(!json_is_array(array_i))
	{
	  fprintf(stderr, "error: %s[%d] is not an array\n", array_name, i);
	  exit(EXIT_FAILURE);
	}
      sprintf(array_name_i, "%s[%d]", array_name, i);
      tab[i] = fast_load_fill_json_1u(array_i, array_name_i);
    }

  return tab;
  
};

unsigned int ***fast_load_fill_json_3u(json_t *array, char *array_name)
{

  int i;
  char array_name_i[255];  

  unsigned int ***tab = malloc(json_array_size(array) * sizeof(unsigned int **));  
  if(tab==NULL)
    {
      fprintf(stderr,"Allocation impossible in file :%s line : %d",__FILE__,__LINE__);
      exit(EXIT_FAILURE);
    }

  
  for(i=0; i< json_array_size(array); i++)
    {
      json_t *array_i;      
      array_i = json_array_get(array, i);
      if(!json_is_array(array_i))
	{
	  fprintf(stderr, "error: %s[%d] is not an array\n", array_name, i);
	  exit(EXIT_FAILURE);
	}
      sprintf(array_name_i, "%s[%d]", array_name, i);
      tab[i] = fast_load_fill_json_2u(array_i, array_name_i);
    }

  return tab;
  
};















double *fast_load_fill_json_1d(json_t *array, char *array_name)
{
  /* handles properly null values */
  int i;
  double *tab = malloc(json_array_size(array) * sizeof(double));  
  if(tab==NULL)
    {
      fprintf(stderr,"Allocation impossible in file :%s line : %d",__FILE__,__LINE__);
      exit(EXIT_FAILURE);
    }

  for(i=0; i< json_array_size(array); i++)
    {
      json_t *array_i;      
      array_i = json_array_get(array, i);

      if(json_is_real(array_i))
	{
	  tab[i] = json_real_value(array_i);
	}
      else if(json_is_null(array_i))
	{
	  tab[i] = NAN;	      
	}
      else
	{    
	  fprintf(stderr, "error: %s[%d] is not a real nor null\n", array_name, i);
	  exit(EXIT_FAILURE);
	}
    }

  return tab;
  
};

double **fast_load_fill_json_2d(json_t *array, char *array_name)
{
  /* handles properly null values */

  int i;
  char array_name_i[255];  

  double **tab = malloc(json_array_size(array) * sizeof(double *));  
  if(tab==NULL)
    {
      fprintf(stderr,"Allocation impossible in file :%s line : %d",__FILE__,__LINE__);
      exit(EXIT_FAILURE);
    }

  
  for(i=0; i< json_array_size(array); i++)
    {
      json_t *array_i;      
      array_i = json_array_get(array, i);
      if(!json_is_array(array_i))
	{
	  fprintf(stderr, "error: %s[%d] is not an array\n", array_name, i);
	  exit(EXIT_FAILURE);
	}
      sprintf(array_name_i, "%s[%d]", array_name, i);
      tab[i] = fast_load_fill_json_1d(array_i, array_name_i);
    }

  return tab;
  
};





double ***fast_load_fill_json_3d(json_t *array, char *array_name)
{
  /* handles properly null values */

  int i;
  char array_name_i[255];  

  double ***tab = malloc(json_array_size(array) * sizeof(double **));  
  if(tab==NULL)
    {
      fprintf(stderr,"Allocation impossible in file :%s line : %d",__FILE__,__LINE__);
      exit(EXIT_FAILURE);
    }

  
  for(i=0; i< json_array_size(array); i++)
    {
      json_t *array_i;      
      array_i = json_array_get(array, i);
      if(!json_is_array(array_i))
	{
	  fprintf(stderr, "error: %s[%d] is not an array\n", array_name, i);
	  exit(EXIT_FAILURE);
	}
      sprintf(array_name_i, "%s[%d]", array_name, i);
      tab[i] = fast_load_fill_json_2d(array_i, array_name_i);
    }

  return tab;
  
};



json_t *load_json(void)
{  
  char *tmp;
  tmp = malloc(BUFFER_SIZE* sizeof(char));  

  fgets(tmp, BUFFER_SIZE, stdin);
  //  printf("%s\n", tmp);

  json_t *root;
  json_error_t error;
  
  root = json_loads(tmp, 0, &error);
  if(!root)
    {
      fprintf(stderr, "error: on line %d: %s\n", error.line, error.text);
      exit(EXIT_FAILURE);
    }

  free(tmp);

  return root;
}


int main(int argc, char *argv[])
{

  json_t *root = load_json();
  
  //parse the json  

  //cst
  json_t *cst = fast_get_json_object(root, "cst");

  printf("N_TS =%d\n", fast_get_json_integer(cst, "N_TS"));
  printf("ONE_YEAR_IN_DATA_UNIT = %g\n", fast_get_json_double(cst, "ONE_YEAR_IN_DATA_UNIT"));

  json_t *data = fast_get_json_array(fast_get_json_object(root, "data"), "data");
  double **mydata = fast_load_fill_json_2d(data, "data");

  json_t *pop_sizes = fast_get_json_array(fast_get_json_object(root, "data"), "pop_sizes");
  double *mypop_sizes = fast_load_fill_json_1d(pop_sizes, "pop_sizes");


  int i;
  for(i=0; i<52; i++)
    printf("%g\t%g\n", mydata[i][0], mydata[i][1]);

  for(i=0; i<2; i++)    
    printf("%g\n", mypop_sizes[i]);



  /*transform functions*/
  json_t *transfo = fast_get_json_object(root, "transfo");
  json_t *transfo_par_proc= fast_get_json_array(transfo, "par_proc");


  for(i=0; i<json_array_size(transfo_par_proc); i++)
    {      
      const char *f_name, *f_inv_name, *f_inv_print_name;
      double multiplier_f, multiplier_f_inv, multiplier_f_inv_print;

      json_t *transfo_par_proc_i= json_array_get(transfo_par_proc, i);
      if(!json_is_array(transfo_par_proc_i))
	{
	  fprintf(stderr, "error: transfo_par_proc_i is not an array\n");
	  exit(EXIT_FAILURE);
	}

      if(json_unpack(transfo_par_proc_i, "[sfsfsf]" , &f_name, &multiplier_f, &f_inv_name, &multiplier_f_inv, &f_inv_print_name, &multiplier_f_inv_print))
	{
	  fprintf(stderr,"error in transfo_par_proc[%d]\n",i);
	  exit(EXIT_FAILURE);
	}

      printf("%s\t%g %s\t%g %s\t%g\n", f_name, multiplier_f, f_inv_name, multiplier_f_inv, f_inv_print_name, multiplier_f_inv_print );
    }

  /* par_fixed_values */
  json_t *json_par_fixed = fast_get_json_array(fast_get_json_object(root, "order"), "par_fixed");
  json_t *json_par_fixed_values = fast_get_json_object(fast_get_json_object(root, "data"), "par_fixed_values");
  double ***par_fixed;  
  
  par_fixed = malloc(json_array_size(json_par_fixed) * sizeof(double **));
  if(par_fixed==NULL)
    {
      fprintf(stderr,"Allocation impossible in file :%s line : %d",__FILE__,__LINE__);
      exit(EXIT_FAILURE);
    }
  
  for(i=0; i< json_array_size(json_par_fixed); i++)
    {
      char par_fixed_name[255];
      json_t *tmp_str = json_array_get(json_par_fixed, i);
      json_t *json_my_par_fixed_values;
      
      if(!json_is_string(tmp_str))
	{
	  fprintf(stderr, "error: par_fixed[%d] is not a string\n", i);
	  exit(EXIT_FAILURE);
	}
      strcpy(par_fixed_name, json_string_value(tmp_str));
      printf("%s\n", par_fixed_name);
      json_my_par_fixed_values = fast_get_json_array(json_par_fixed_values, par_fixed_name);
      par_fixed[i] = fast_load_fill_json_2d(json_my_par_fixed_values, par_fixed_name);      
    }


  for(i=0; i<52; i++)
    printf("%g\t%g\t%g\t%g\t%g\t%g\n", par_fixed[0][i][0], par_fixed[0][i][1], par_fixed[1][i][0], par_fixed[1][i][1], par_fixed[2][i][0], par_fixed[2][i][1]);
  



  for(i=0; i<52; i++)
    free(mydata[i]);
  free(mydata);  

  free(mypop_sizes);

  json_decref(root);  
  
  return 0;
  
}



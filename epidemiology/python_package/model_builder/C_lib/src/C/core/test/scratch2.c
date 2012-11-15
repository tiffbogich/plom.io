#include <stdio.h>
#include <stdlib.h>
#include <gsl/gsl_vector.h>
#include <string.h>





int main(int argc, char *argv[])
{
  int i;

  gsl_vector *v = gsl_vector_alloc(5);  
  double *a = v->data;  
  
  for(i=0; i<5; i++)
    gsl_vector_set(v, i, i*3.6);

  for(i=0; i<5; i++)
    printf("%g\n", a[i]);

  gsl_vector_free(v);


  char function_name[255], function_name2[255], function_name3[255];
  double multiplier;
  
  function_name2[0] = 'a';
  function_name3[0] = 'b';
  function_name2[1] = '\0';
  function_name3[1] = '\0';
  puts(function_name2);
  puts(function_name3);
  

  FILE* myfile = NULL;
  myfile = fopen("test.dat", "r");

  if( myfile != NULL )
    {
      while( (fscanf(myfile,"%s\t%lf", function_name, &multiplier)!=EOF) )
	{
	  if(strcmp(function_name, "f_id") == 0)
	    {
	      puts(function_name);
	      printf("multiplier:%g\n", multiplier);
	    }
	}
      fclose(myfile);
      myfile=NULL;
    }
  else
    {
      fprintf(stderr, "failed to read %s\n", "test.dat");
    }

  
  for(i=0 ; i< 10 ; i+=2)
    printf("%d\n", i);
  


  return 0;
}




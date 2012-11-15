#include <stdio.h>
#include <stdlib.h>


struct s_test
{
  double **a;
  double **b;
};

  

double *init1d_set0(int n)
{
  int i;
  double *tab = malloc(n*sizeof (double));

  if(tab==NULL)
    {
      fprintf(stderr,"Allocation impossible in file :%s line : %d",__FILE__,__LINE__);
      exit(EXIT_FAILURE);
    }

  for(i=0;i<n;i++)
    tab[i]=0.0;

  return tab;  
}


double **init2d_set0(int n, int p)
{
  int i;
  double **tab = malloc(n* sizeof (double *));

  if(tab==NULL)
    {
      fprintf(stderr,"Allocation impossible in file :%s line : %d",__FILE__,__LINE__);
      exit(EXIT_FAILURE);
    }

  for(i=0;i<n;i++)
    tab[i] = init1d_set0(p);
  
  return tab;
}

void swap_2d(double ***A, double ***tmp_A)
{
  /* swap array of pointers to double */

  double **tmp;
  tmp=*tmp_A;
  *tmp_A=*A;
  *A=tmp;
}



void swaper_wrong(double **a, double **b)
{
  swap_2d(&a, &b);
}


void swaper(double ***a, double ***b)
{

  printf("%p\t%p\n", *a, *b);

  swap_2d(a, b);

  printf("%p\t%p\n", *a, *b);
}



void f(struct s_test *p_test)
{
  printf("%p\t%p\n", p_test->a, p_test->b);  

  swaper(&(p_test->a), &(p_test->b));
}


int main(int argc, char *argv[])
{  

  double **a = init2d_set0(3,3);
  a[0][0] = 3.0;
  a[2][2] = 9.0;

  double **b = init2d_set0(3,3);

  

  struct s_test test;
  struct s_test *p_test = &test;
  p_test->a = a;
  p_test->b = b;

  printf("%p\t%p\n", a, b);
  printf("%p\t%p\n", p_test->a, p_test->b);

  f(p_test);

  printf("after\n");
  
  printf("%p\t%p\n", a, b);
  printf("%p\t%p\n", p_test->a, p_test->b);


  
  printf("swaper\n");  
  printf("a:%g b:%g\n", p_test->a[0][0], p_test->b[0][0]);  
  printf("a:%g b:%g\n", p_test->a[2][2], p_test->b[2][2]);

  return 0;
  
}

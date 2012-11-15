#include <stdio.h>
#include <stdlib.h>

#define FREE(ppp) do{   \
    free( ppp );      \
    ppp = NULL;       \
  }while(0)


/*test of simforence constructor lib*/

struct s_a
{
  double *ta;
};

struct s_b
{
  struct s_a *a;  
  double *tb;
};


void tester(int **a)
{
  printf("a: %d\n", a[0][0]);
}



void init1d_set0(double **tab, int n)
{
  int i;

  *tab=malloc(n*sizeof (double));
  if(*tab==NULL)
    {
      fprintf(stderr,"Allocation impossible in file :%s line : %d",__FILE__,__LINE__);
      exit(EXIT_FAILURE);
    }

  for(i=0;i<n;i++)
    (*tab)[i]=0.0;

}


struct s_a* build_a(void){
  struct s_a *a;
  a = malloc(sizeof(struct s_a));
  init1d_set0(&(a->ta), 10);  

  a->ta[5]=777.0;
  
  return a;  
}


struct s_b* build_b(void){
//  struct s_a *a;
//  a = malloc(sizeof(struct s_a));
//  init1d_set0(&(a->ta), 10);  

  struct s_a *a;
  a = build_a();  
  
  struct s_b *b;
  b = malloc(sizeof(struct s_b));
  b->a = a;
  init1d_set0(&(b->tb), 20);  
  b->tb[3]=455.0;
  

  return b;  
}

void clean_b(struct s_b *b){
  FREE(b->a->ta);
  FREE(b->tb);

  FREE(b->a);
  FREE(b);
}

struct s_b **build_tab_b(void)
{
  int i;

  struct s_b **tab_b;

  tab_b = malloc(4*sizeof (struct s_b *));
  for (i=0; i<4; i++)
    {
      tab_b[i]=build_b();      
    }

  return tab_b;
  
}


int main(int argc, char *argv[])
{
  int i;
  
  struct s_b *b;  
  b = build_b();

  printf("%g\n", b->tb[3]);
  printf("%g\n", b->a->ta[5]);
  
  clean_b(b);  


  struct s_b **tab_b;
  tab_b = build_tab_b();

  printf("%g\n", tab_b[1]->tb[3]);
  printf("%g\n", tab_b[3]->a->ta[5]);


  for (i=0; i<4; i++)
    {
      FREE(tab_b[i]);
    }
  FREE(tab_b);  


  if((1==1) && 0)
    {
      puts("false");
    }
  if((1==1) && 1)
    {
      puts("true");  
    }



  int *a = malloc(sizeof(int));  
  *a= 3;
  int zero = 0;
    
  int *true_i = &i;
  int *fake_i = &zero;  

  for(i=0;i<5;i++)
    {
      printf("true %d\t%d\n", i, *true_i);      
      printf("fake %d\t%d\n", i, *fake_i);      
      tester(&a);      
    }

  free(a);


  for(i=1;i<1;i++)
    {
      puts("don't print me");      
    }


  return 0;
}




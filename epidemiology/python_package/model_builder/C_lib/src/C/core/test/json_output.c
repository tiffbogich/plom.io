//gcc -Wall json_input.c -lm -ljansson && ./a.out< tutorial.json 

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <jansson.h>


#define BUFFER_SIZE (5000 * 1024)  /* 5000 KB */

void print_log(char *msg)
{
  json_t *root;
  root = json_pack("{s,s,s,s}", "flag", "log", "msg", msg);
  json_dumpf(root, stdout, 0); printf("\n");
  fflush(stdout);
  json_decref(root);
}


int main(int argc, char *argv[])
{

  print_log("hello world");
  
  return 0;
  
}



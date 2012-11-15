#include <stdio.h>
#include <stdlib.h>
#include <stddef.h>
#include <string.h>
#include <math.h>
#include <time.h>

#include <jansson.h> //json


#include <unistd.h>

#define BUFFER_SIZE (5000 * 1024)  /* 5000 KB */


json_t *load_json(void)
{  
  char *tmp;
  tmp = malloc(BUFFER_SIZE* sizeof(char));  

  fgets(tmp, BUFFER_SIZE, stdin);
  //  printf("%s\n", tmp);

  json_t *root;
  json_error_t error;

  printf("from C: %s\n", tmp);  
  
  root = json_loads(tmp, 0, &error);
  if(!root)
    {
      fprintf(stdout, "error: on line %d: %s\n", error.line, error.text);
      exit(EXIT_FAILURE);
    }  

  free(tmp);

  return root;
}


int main(int argc, char *argv[])
{

  
  json_t *root = load_json();

  char *tmp;
  tmp = malloc(BUFFER_SIZE* sizeof(char));
  tmp = json_dumps(root, 0);
  printf("from json: %s\n", tmp);
  free(tmp);

return 0;
}

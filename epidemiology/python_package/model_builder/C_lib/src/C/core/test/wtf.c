#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#include <jansson.h>


#define BUFFER_SIZE (5000 * 1024)  /* 5000 KB */
#define STR_BUFFSIZE 255



json_t *load_json(void)
{  
  char *tmp;
  tmp = malloc(BUFFER_SIZE* sizeof(char));  

  json_t *root;
  json_error_t error;

  fgets(tmp, BUFFER_SIZE, stdin);
  
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
  json_t *root;
  
  char *tmp = malloc(BUFFER_SIZE* sizeof(char));
  root = load_json();
  tmp = json_dumps(root, 0);
  printf("%s", tmp);
  
  free(tmp);
  json_decref(root);

  return 0;
}

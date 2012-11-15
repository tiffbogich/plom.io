#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#include <jansson.h>


#define BUFFER_SIZE (5000 * 1024)  /* 5000 KB */
#define STR_BUFFSIZE 255


void ask_update()
{
  json_t *root;
  root = json_pack("{s,s}", "flag", "upd");
  json_dumpf(root, stdout, 0); printf("\n");
  fflush(stdout);
  json_decref(root);
}


void print_log(char *msg)
{
  json_t *root;
  root = json_pack("{s,s,s,s}", "flag", "log", "msg", msg);
  json_dumpf(root, stdout, 0); printf("\n");
  fflush(stdout);
  json_decref(root);
}


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

  int i;
  char str[STR_BUFFSIZE];
  json_t *root;
  
  char *tmp = malloc(BUFFER_SIZE* sizeof(char));

  for(i=0; i<20; i++)
    {
      ask_update();
      root = load_json();
      tmp = json_dumps(root, 0);
      sprintf(str, "iteration: %d, (after %s)", i, tmp);
      print_log(str);      

      //do stuff
      sleep(2);
      
    }
  
  free(tmp);
  json_decref(root);

  return 0;
}

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

void process_update(void)
{
    /* integrate best data from the webApp (will block untill json data are received) */

    json_t *root;
    root = load_json();

    if(json_object_size(root)) {
	printf("data integrated\n");
    } else {
	printf("empty\n");
    }
    

    json_decref(root);
}

int main(int argc, char *argv[])
{

    process_update();
    
    return 0;
}

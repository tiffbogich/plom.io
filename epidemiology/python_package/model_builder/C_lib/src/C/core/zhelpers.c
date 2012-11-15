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


int sfr_send (void *socket, char *string)
{
    /* send 0 terminated string */
    int rc;
    zmq_msg_t message;
    zmq_msg_init_size (&message, strlen(string)+1); //add 0 at the end
    memcpy (zmq_msg_data (&message), string, strlen(string)+1);
    rc = zmq_send (socket, &message, 0);
    zmq_msg_close (&message);
    return (rc);
}


int send_array_d(void *socket, double *array, int array_size, int zmq_options)
{
    int rc;
    zmq_msg_t msg;
    zmq_msg_init_size (&msg, array_size * sizeof(double));
    memcpy (zmq_msg_data (&msg), array, array_size * sizeof(double));
    rc = zmq_send (socket, &msg, zmq_options);
    zmq_msg_close (&msg);
    return (rc);
}

int send_int(void *socket, int x, int zmq_options)
{
    int rc;
    zmq_msg_t msg;
    zmq_msg_init_size (&msg, sizeof(int));
    memcpy (zmq_msg_data (&msg), &x, sizeof(int));
    rc = zmq_send (socket, &msg, zmq_options);
    zmq_msg_close (&msg);
    return (rc);
}


int send_double(void *socket, double x, int zmq_options)
{
    int rc;
    zmq_msg_t msg;
    zmq_msg_init_size (&msg, sizeof(double));
    memcpy (zmq_msg_data (&msg), &x, sizeof(double));
    rc = zmq_send (socket, &msg, zmq_options);
    zmq_msg_close (&msg);
    return (rc);
}



int send_int64_t(void *socket, int64_t x, int zmq_options)
{
    int rc;
    zmq_msg_t msg;
    zmq_msg_init_size (&msg, sizeof(int64_t));
    memcpy (zmq_msg_data (&msg), &x, sizeof(int64_t));
    rc = zmq_send (socket, &msg, zmq_options);
    zmq_msg_close (&msg);
    return (rc);
}



int send_par(void *socket, const struct s_par *p_par, struct s_data *p_data, int zmq_options)
{
    int rc;
    int i;

    //send "natural" component of p_par
    for(i=0; i< p_par->size_natural; i++) {
        rc = send_array_d(socket, p_par->natural[i], p_data->routers[i]->n_gp, zmq_options);
    }

    return (rc);
}


void recv_par(struct s_par *p_par, struct s_data *p_data, void *socket)
{
    int i;

    //natural
    for(i=0; i< p_par->size_natural; i++) {
        recv_array_d(p_par->natural[i], p_data->routers[i]->n_gp, socket);
    }

}


int send_X(void *socket, const struct s_X *p_X, struct s_data *p_data, int zmq_options)
{
    int rc;
    int i;

    //send drift
    if(p_X->size_drift) {
        for(i=0; i< p_X->size_drift; i++) {
            rc = send_array_d(socket,
                              p_X->drift[i],
                              p_data->routers[ p_data->p_drift->ind_par_Xdrift_applied[i] ]->n_gp,
                              ZMQ_SNDMORE);
        }
    }
    //if we want that the worker compute the likelihood
    //send obs
    //    rc = send_array_d(socket, p_X->obs, p_X->size_obs, ZMQ_SNDMORE);

    //send proj
    rc = send_array_d(socket, p_X->proj, p_X->size_proj, zmq_options);

    return (rc);
}

void recv_X(struct s_X *p_X, struct s_data *p_data, void *socket)
{
    int i;

    //drift
    if(p_X->size_drift) {
        for(i=0; i< p_X->size_drift; i++) {
            recv_array_d(p_X->drift[i],
                         p_data->routers[ p_data->p_drift->ind_par_Xdrift_applied[i] ]->n_gp,
                         socket);
        }
    }

    //if we want that the worker compute the likelihood
    //obs
    //    recv_array_d(p_X->obs, p_X->size_obs, socket);

    //proj
    recv_array_d(p_X->proj, p_X->size_proj, socket);

}



char *recv_str(void *socket)
{
    /* receive string
       NOTE: caller must free returned string */

    zmq_msg_t msg;
    zmq_msg_init(&msg);
    zmq_recv(socket, &msg, 0);

    int size = zmq_msg_size (&msg);
    char *string = malloc(size);

    memcpy(string, (char *) zmq_msg_data(&msg), size);
    zmq_msg_close (&msg);

    return string;
}

int recv_int(void *socket)
{
    /* receive an int */

    int x;

    zmq_msg_t msg;
    zmq_msg_init(&msg);
    zmq_recv(socket, &msg, 0);
    x = *((int *) zmq_msg_data(&msg));
    zmq_msg_close (&msg);

    return x;
}

double recv_double(void *socket)
{
    /* receive a double */

    double x;

    zmq_msg_t msg;
    zmq_msg_init(&msg);
    zmq_recv(socket, &msg, 0);
    x = *((double *) zmq_msg_data(&msg));
    zmq_msg_close (&msg);

    return x;
}



int64_t recv_int64_t(void *socket)
{
    /* receive an int64_t */

    int64_t x;

    zmq_msg_t msg;
    zmq_msg_init(&msg);
    zmq_recv(socket, &msg, 0);
    x = *((int64_t *) zmq_msg_data(&msg));
    zmq_msg_close (&msg);

    return x;
}


void recv_array_d(double *array, int array_size, void *socket)
{
    /* receive an array of double with array_size elements */

    zmq_msg_t msg;
    zmq_msg_init(&msg);
    zmq_recv(socket, &msg, 0);
    memcpy(array, (double *) zmq_msg_data(&msg), array_size * sizeof(double));
    zmq_msg_close (&msg);
}




int sfr_send_zero_copy (void *socket, char *string)
{
    /* zero copy version: see http://www.zeromq.org/blog:zero-copy */

    int rc;
    zmq_msg_t message;
    void *hint = NULL;
    zmq_msg_init_size (&message, strlen(string)+1); //add 0 at the end

    zmq_msg_init_data (&message, string, strlen(string)+1, free_zmq_msg_zero_copy, hint);
    rc = zmq_send (socket, &message, 0);

    zmq_msg_close (&message);
    return (rc);
}


void free_zmq_msg_zero_copy(void *data, void *hint)
{
    free(data);
}

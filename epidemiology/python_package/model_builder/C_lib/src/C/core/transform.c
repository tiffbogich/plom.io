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


/*
 * Transformation functions these function **MUST** have a prototype of the form:
 * double f_(double x, double multiplier, double a, double b)
 * even if a and b won't be used
 */


double f_id(double x, double multiplier, double a, double b)
{

    //change unit first to the data unit and then transform
    return x*multiplier;
}


double f_log(double x, double multiplier, double a, double b)
{
    double safe = ( (x*multiplier) > ZERO_LOG ) ? x*multiplier : ZERO_LOG; //change unit to the data unit and sanatize

    return log(safe); //transform
}

double f_inv_log(double x, double multiplier, double a, double b)
{
    return exp(x)*multiplier; //back transform and then rescale from the data unit to another unit
}


double f_inv_log_duration2rate(double x, double multiplier, double a, double b)
{
    //x is a duration (in the data unit) log transformed.
    //First we unlog,
    //then we make it a rate
    //then, we rescale the rate from the data unit to another unit

    return (1.0/(0.0001+exp(x))) * multiplier;
}


double f_inv_duration2rate(double x, double multiplier, double a, double b)
{
    return (1.0/(0.0001+x)) * multiplier; //x is a duration (in the data unit) non transformed. We make it a rate and then, we rescale the rate from the data unit to another unit
}



/**
 * logit transfo: we use logit transfor only for proportion (ie parameter that are **unit less**)
 */
double f_logit(double x, double multiplier, double a, double b)
{
    //sanatize
    double safe = ( x > ZERO_LOG ) ? x : ZERO_LOG;
    safe = (safe < ONE_LOGIT ) ? safe : ONE_LOGIT;

    return log(safe/(1.0-safe)); //transform
}

/**
 * inverse of the logit transfo: NOTE that we use logit transfor only for proportion (ie parameter that are **unit less**)
 */
double f_inv_logit(double x, double multiplier, double a, double b)
{
    return (1.0/(1.0+exp(-x))); //unlogit
}


/**
 * logit_ab transformation. logit_ab looses the units so we don't do
 * any unit transformation here. It has to be done at the f_inv
 * level!!
 */
double f_logit_ab(double x, double multiplier, double a, double b)
{
    //sanititize
    //NOTE that if a and b given in same unit as x, no need to rescale, the logit_ab transform will always have the same value
    double safe = ( (x) > (ZERO_LOG + a) ) ? x : ZERO_LOG + a;
    safe = (safe < (a + ONE_LOGIT*(b-a)) ) ? safe :  a + ONE_LOGIT*(b-a);

    if (a == b)
        return x; // nothing will happen in the transformed space for x, so no need to transform it
    else
        return log((safe-a)/(b-safe)); //transform
}

/**
 * inverse of the logit_ab transformation. This function also ensure
 * that the return value is in the unit of the data or the user (depending if called as f_inv of f_inv_print) as we lost the
 * unit when we used f_logit_ab
 */
double f_inv_logit_ab(double x, double multiplier, double a, double b)
{

    if (a == b) {
        return x * multiplier ;// nothing will happen in the transformed space for_ab)
    } else {
        //x is logit_ab
        //1) unlogit ab it
        //2) rescale to the unit of the data as that could not be achieved in f_logit_ab
        return ((b*exp(x)+a)/(1.0+exp(x))) * multiplier;
    }
}


/**
 * ...
 **/
double f_inv_logit_ab_duration2rate(double x, double multiplier, double a, double b)
{

    if (a == b) {
        // nothing will happen in the transformed space for
        return (1.0/(0.0001+x* multiplier));

    } else {
        //x is a duration (in the data unit) logit_ab transformed.
        //First we unlogit_ab,
        //then, we rescale the duration to another unit as this could not be achieved by f_logit_ab but should have taken place there.
        //then we make it a rate by taking 1/duration

        return (1.0/(0.0001+ ((b*exp(x)+a)/(1.0+exp(x)))* multiplier));
    }
}



/**
 * derivative of f_id
 */
double f_der_id(double x, double multiplier, double a, double b)
{
    return multiplier;
}

/**
 * derivative of f_log
 */
double f_der_log(double x, double multiplier, double a, double b)
{
    return 1.0/x;
}

/**
 * derivative of f_logit
 */
double f_der_logit(double x, double multiplier, double a, double b)
{
    return 1.0/(x-multiplier*x*x);
}

/**
 * derivative of f_logit_ab
 */
double f_der_logit_ab(double x, double multiplier, double a, double b)
{
    return (b-a)/((x-a)*(b-x));
}








/**
 *returns a multiplier that converts *duration* from u_par to u_data
 *using the following *multipliers
 */

double u_duration_par2u_data(const char *u_par, const char *u_data)
{
    if (strcmp(u_par, "D") == 0) {

        if(strcmp(u_data, "D") == 0)
            return 1.0;
        else if (strcmp(u_data, "W") == 0)
            return 1.0/7.0;
        else if (strcmp(u_data, "M") == 0)
            return 12.0/365.0;
        else if (strcmp(u_data, "Y") == 0)
            return 1.0/365.0;

    } else if (strcmp(u_par, "W") == 0) {

        if(strcmp(u_data, "D") == 0)
            return 7.0;
        else if (strcmp(u_data, "W") == 0)
            return 1.0;
        else if (strcmp(u_data, "M") == 0)
            return 84.0/365.0;
        else if (strcmp(u_data, "Y") == 0)
            return 7.0/365.0;

    } else if (strcmp(u_par, "M") == 0) {

        if(strcmp(u_data, "D") == 0)
            return 365.0/12.0;
        else if (strcmp(u_data, "W") == 0)
            return 365.0/84.0;
        else if (strcmp(u_data, "M") == 0)
            return 1.0;
        else if (strcmp(u_data, "Y") == 0)
            return 1.0/12.0;

    } else if (strcmp(u_par, "Y") == 0) {

        if(strcmp(u_data, "D") == 0)
            return 365.0;
        else if (strcmp(u_data, "W") == 0)
            return 365.0/7.0;
        else if (strcmp(u_data, "M") == 0)
            return 12.0;
        else if (strcmp(u_data, "Y") == 0)
            return 1.0;
    } else {
        print_err("invalid units");
        exit(EXIT_FAILURE);
    }

    return -1;
}


/**
 * Check if the parameter is a rate or a duration, if so return the
 * corresponding multiplier necessary for unit conversion, if not
 * return 1.0
 * @param direction: if 0 convert from user unit to data unit, if 1 convert from data unit to user unit
 */

double get_multiplier(const char *u_data, const json_t *par, int direction)
{
    json_t *unit = json_object_get(par, "unit");
    if (unit) {
        const char *u_par = json_string_value(unit);

        if ( (strcmp(u_par, "D") == 0) || (strcmp(u_par, "W") == 0) || (strcmp(u_par, "M") == 0) || (strcmp(u_par, "Y") == 0) ) {
            json_t *type = json_object_get(par, "type");
            if (type) {
                const char *mytype = json_string_value(type);

                if ( strcmp(mytype, "rate_as_duration") == 0) { // => duration

                    return (direction) ? u_duration_par2u_data(u_data, u_par) : u_duration_par2u_data(u_par, u_data);

                } else {
                    print_err("not a valid type");
                    exit(EXIT_FAILURE);
                }
            } else { //no type but a unit => rate


                return (direction) ? u_duration_par2u_data(u_par, u_data) : u_duration_par2u_data(u_data, u_par);

            }

        } else {
            print_err("error not a valid unit");
            exit(EXIT_FAILURE);
        }

    } else { //no unit => neither rate  nor duration
        return 1.0;
    }
}


/**
 * return 1 if the parameter is a duration, otherwise 0
 */
int is_duration(const json_t *par)
{
    json_t *unit = json_object_get(par, "unit");

    if (unit) {
        json_t *type = json_object_get(par, "type");
        if (type) {
            const char *mytype = json_string_value(type);
            if ( strcmp(mytype, "rate_as_duration") == 0) { // => duration
                return 1;
            }
        }
    }

    return 0;
}


/**
 * Set the transformation function of the router p_router
 * corresponding to the parameter par
 *
 * f_: transform from the user intuitive scale to the unit of the data
 * and then apply the transfo required by the constraint. Durations
 * are NOT transformed into rates
 *
 * f_inv: transform from the constraint scale in the unit of the data
 * to the unconstraint scale STILL in the unit of the data AND brings
 * duration back to rates, NO unit transformation is involved in
 * f_inv
 *
 * f_inv_print: transform a value in the constraint scale and in the
 * unit of the data back to the user intuitive unit. f_inv_print
 * cancel the constraint and the unit transform. This is the exact
 * opposite of f_
 */

void set_f_trans(struct s_router *p_router, const json_t *par, const char *u_data, int is_bayesian)
{
    const char *prior_type = fast_get_json_string_from_object(par, "prior");

    if ( is_bayesian && (strcmp(prior_type, "uniform") == 0)) {

        p_router->f = &f_logit_ab;
        p_router->multiplier_f = 1.0; //logit_ab doesn't see the multiplier...

        p_router->f_inv = is_duration(par) ? &f_inv_logit_ab_duration2rate :  &f_inv_logit_ab;
        p_router->multiplier_f_inv = get_multiplier(u_data, par, 0);

        p_router->f_inv_print = &f_inv_logit_ab;
        p_router->multiplier_f_inv_print = 1.0; //logit_ab did not change the unit...

        p_router->f_derivative = &f_der_logit_ab;
        p_router->multiplier_f_derivative = 1.0;

    } else {

        json_t *transf = json_object_get(par, "transformation");

        if (transf) {
            const char *mytransf = json_string_value(transf);

            if (strcmp(mytransf, "log")==0) {

                p_router->f = &f_log;
                p_router->multiplier_f = get_multiplier(u_data, par, 0);

                p_router->f_inv = is_duration(par) ? &f_inv_log_duration2rate :  &f_inv_log;
                p_router->multiplier_f_inv = 1.0;

                p_router->f_inv_print = &f_inv_log;
                p_router->multiplier_f_inv_print = get_multiplier(u_data, par, 1);

                p_router->f_derivative = &f_der_log;
                p_router->multiplier_f_derivative = p_router->multiplier_f;

            } else if (strcmp(mytransf, "logit")==0) {

                p_router->f =  &f_logit;
                p_router->multiplier_f = 1.0;

                p_router->f_inv = &f_inv_logit;
                p_router->multiplier_f_inv = 1.0;

                p_router->f_inv_print = &f_inv_logit;
                p_router->multiplier_f_inv_print = 1.0;

                p_router->f_derivative = &f_der_logit;
                p_router->multiplier_f_derivative = p_router->multiplier_f;

            } else {
                print_err("error transf != log or logit");
                exit(EXIT_FAILURE);
            }

        } else { //no transf

            p_router->f = &f_id;
            p_router->multiplier_f = get_multiplier(u_data, par, 0);

            p_router->f_inv = is_duration(par) ? &f_inv_duration2rate : &f_id;
            p_router->multiplier_f_inv = 1.0;

            p_router->f_inv_print = &f_id;
            p_router->multiplier_f_inv_print = get_multiplier(u_data, par, 1);

            p_router->f_derivative = &f_der_id;
            p_router->multiplier_f_derivative = p_router->multiplier_f;
        }

    }

}




/**
 *   back transform selection of theta
 */
void back_transform_theta2par(struct s_par *p_par, const theta_t *theta, const struct s_iterator *p_it, struct s_data *p_data)
{

    int i, k;
    struct s_router **routers = p_data->routers;

    for(i=0; i<p_it->length; i++){
        struct s_router *r = routers[p_it->ind[i]];
        for(k=0; k< r->n_gp; k++) {
            p_par->natural[ p_it->ind[i] ][k] = (*(r->f_inv))( gsl_vector_get(theta, p_it->offset[i]+k), r->multiplier_f_inv, r->min[k], r->max[k]);
        }
    }
}



double transit_mif(double sd_x)
{
    /*For the MIF, for par_proc and par_obs, we divide sdt by sqrt(N_DATA)*/

    return sd_x /( sqrt( (double) N_DATA ) );
}


/**
   Transform parameters and standard deviation entered by the user in
   an intuitive scale in the transformed scale (converting time unit
   to the unit of the data). The standard deviations are also
   converted into **variance**.

   *Note that 0.0 value for standard deviations are treated as a
   special case and keep their 0.0 values.*

   @param[in, out] p_best the *untransformed* s_best structure that
   will be transformed

   @param[in] f_transit_par, f_transit_state the transformation
   functions. 2 transformation functions have to be provided as each
   method (pMCMC, simplex, MIF...) can possibly need a different
   transit function for *parameters* and *initial condition and
   drift*.  For instance in case of MIF, parameters and initial
   conditions are not estimated with the same method and might need
   different transfromation functions. If the transformation functions
   are @c NULL, the initial standard deviation is let untransformed
   and just squared to a variance.

   @param[in] webio a flag indicating if p_best comes from the
   webApp. In this latter case only the property var of p_best will be
   updated.

   @see transit_mif, update_walk_rates
*/
void transform_theta(struct s_best *p_best,
                     double (*f_transit_par) (double),
                     double (*f_transit_state) (double),
                     struct s_data *p_data,
                     int webio)
{

    /* syntaxic shortcuts */
    gsl_vector *x = p_best->mean;
    gsl_matrix *var = p_best->var;
    struct s_router **routers = p_data->routers;
    struct s_iterator *p_it_mif = p_data->p_it_par_proc_par_obs_no_drift;
    struct s_iterator *p_it_fls = p_data->p_it_par_sv_and_drift; //fls => fixed lag smoothing
    double val_sd;

    int i, k;

    //parameters
    for (i=0; i<p_it_mif->length; i++) {

        struct s_router *r = routers[ p_it_mif->ind[i] ];

        for (k=0; k< r->n_gp; k++) {

            if (gsl_matrix_get(var, p_it_mif->offset[i]+k, p_it_mif->offset[i]+k) > 0.0) { /*keep var to 0 if originaly 0...*/

                if (f_transit_par) {
                    val_sd = (*f_transit_par)(gsl_matrix_get(var, p_it_mif->offset[i]+k, p_it_mif->offset[i]+k));
                } else {
                    val_sd = gsl_matrix_get(var, p_it_mif->offset[i]+k, p_it_mif->offset[i]+k);
                }

                gsl_matrix_set(var,
                               p_it_mif->offset[i]+k,
                               p_it_mif->offset[i]+k,
                               pow(val_sd, 2)
                               );

            }
            if(!webio){
                gsl_vector_set(x, p_it_mif->offset[i]+k,
                               (*(r->f))( gsl_vector_get(x, p_it_mif->offset[i]+k), r->multiplier_f, r->min[k], r->max[k] ) );
            }
        }
    }

    //initial conditions and drift parameters
    for (i=0; i<p_it_fls->length; i++) {

        struct s_router *r = routers[ p_it_fls->ind[i] ];

        for (k=0; k< r->n_gp; k++) {

            if (gsl_matrix_get(var, p_it_fls->offset[i]+k, p_it_fls->offset[i]+k) > 0.0) { /*keep var to 0 if originaly 0...*/
                if (f_transit_state) {
                    val_sd = (*f_transit_state)(gsl_matrix_get(var, p_it_fls->offset[i]+k, p_it_fls->offset[i]+k));

                } else {
                    val_sd = gsl_matrix_get(var, p_it_fls->offset[i]+k, p_it_fls->offset[i]+k);
                }

                gsl_matrix_set(var,
                               p_it_fls->offset[i]+k,
                               p_it_fls->offset[i]+k,
                               pow(val_sd,2)
                               );

            }
            if(!webio){
                gsl_vector_set(x, p_it_fls->offset[i]+k,
                               (*(r->f))( gsl_vector_get(x, p_it_fls->offset[i]+k), r->multiplier_f, r->min[k], r->max[k] ) );
            }
        }
    }
}

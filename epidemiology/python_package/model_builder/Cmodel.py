##########################################################################
#    This file is part of plom.
#
#    plom is free software: you can redistribute it and/or modify it
#    under the terms of the GNU General Public License as published by
#    the Free Software Foundation, either version 3 of the License, or
#    (at your option) any later version.
#
#    plom is distributed in the hope that it will be useful, but
#    WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
#    General Public License for more details.
#
#    You should have received a copy of the GNU General Public
#    License along with plom.  If not, see
#    <http://www.gnu.org/licenses/>.
#########################################################################

import copy

def contextualize(par_proc, proc_model, obs_var_def=[]):
    """add iotas: modify par_proc, proc_model and obs_var_def in place"""

    ##find unique number of infectors types
    ##create a list of tuples of infector types
    infectors = [tuple(m['tag'][0]['by']) for m in proc_model if 'tag' in m and m['tag'][0]['id'] == 'transmission' ]

    ##create the iota parameters (external introduction) and add
    ##iotas to par_proc set(infector) give the unique set of
    ##tuple. Each of these unique tuple is a key and the value is
    ##the name of the iota parameter
    iotas = {}
    for i, k in enumerate(set(infectors)):
        iotas[k] = 'iota_{0}'.format(i)
        par_proc.append(iotas[k])

    ##add iotas to the force of infection **and** update obs_var_def
    for i, m in enumerate(proc_model):
        if 'tag' in m and m['tag'][0]['id'] == 'transmission':
            ##to do safer iota insertion... if beta*S*(I**2+sigma*I) the current version will fail
            new_rate =  m['rate'].replace(m['tag'][0]['by'][0], '({0}+{1})'.format(iotas[tuple(m['tag'][0]['by'])], m['tag'][0]['by'][0]))

            ##update obs_var_def:
            for ii, o in enumerate(obs_var_def):
                if isinstance(o[0], dict): ##incidence
                    for iii, oo in enumerate(o):
                        if oo['from'] == m['from'] and oo['to'] == m['to'] and oo['rate'] == m['rate']:
                            obs_var_def[ii][iii]['rate'] = new_rate

            proc_model[i]['rate'] = new_rate


class Cmodel:

    """
    parse a JSON model description:

    -remove par_fixed from par_obs and par_proc
    -replace N by either sum_SV, p_0 or N depending the context
    -expand the model to take into account non exponential waiting
    time

    NOTE: an JSON model description is always unexpanded. This is
    valid for par_sv, proc_model and obs_model

    """

    def __init__(self, context, process, link,  **kwargs):

        self.op = set(['+', '-', '*', '/', ',', '(', ')']) ##!!!CAN'T contain square bracket '[' ']'
        self.reserved = set(['p_0', 'sum_SV', 'N', 'prop', 'x'])
        self.special_functions = set(['terms_forcing', 'sinusoidal_forcing', 'step', 'step_lin', 'noise', 'drift', 'correct_rate'])
        self.universes = set(['U', 'DU'])


        ###########################################################################
        self.context = copy.deepcopy(context)
        self.pop_size_eq_sum_sv = process['pop_size_eq_sum_sv']


        ##list [{'id':'X'}, ...] => ['X', ...]
        self.par_sv = self.expand_par_sv([x['id'] for x in process['state']], process['model'])

        self.par_fixed = [x['id'] for x in context['data'] if x['id'] != 'data' and x['id'] != 'prop']

        ##remove par_fixed from par_proc and par_obs (be sure to conserve the original order so don't use set')
        self.par_proc = [x['id'] for x in process['parameter'] if x['id'] not in self.par_fixed]
        self.par_obs = [x['id'] for x in link['parameter'] if x['id'] not in self.par_fixed]


        ##undrift models and get drift_var
        self.unexpanded_proc_model, self.drift_par_proc, self.vol_par_proc = self.undrift_proc_model(process['model'])
        self.obs_model, self.drift_par_obs, self.vol_par_obs = self.undrift_obs_model(link['model'])

        self.drift_var = ['drift__par_proc__' + x for x in self.drift_par_proc]
        self.drift_var += ['drift__par_obs__' + x for x in self.drift_par_obs]


        ##resolve the population size: (replace 'N' by either 'sum_SV', 'p_0' or 'N')
        if self.pop_size_eq_sum_sv:
            myN = 'N' if 'N' in self.par_fixed else 'sum_SV'
        else:
            myN = 'N' if 'N' in self.par_fixed else 'p_0'

        for i, m in enumerate(self.unexpanded_proc_model):
            self.unexpanded_proc_model[i]['rate'] = m['rate'].replace('N', myN)

        for k, v in self.obs_model.iteritems():
            if k != 'dist':
                self.obs_model[k] = v.replace('N', myN)


        self.proc_model = self.expand_proc_model(self.unexpanded_proc_model)



        ####IMPORTANT: we sort obs_var so that incidences are first
        sorted_obs_var= copy.deepcopy(link['observed'])
        sorted_obs_var.sort(key=lambda x: 0 if isinstance(x['definition'][0], dict) else 1)

        self.obs_var = []
        self.unexpanded_obs_var_def = []

        ##do a hash to quickly add rate for obs_var_def
        pm = {}
        for v in self.unexpanded_proc_model:
            pm[(v['from'], v['to'])] = v['rate']

        for x in sorted_obs_var:
            self.obs_var.append(x['id'])
            ##add rates if not present to incidences of obs_var_def
            mydef = copy.deepcopy(x['definition'])
            for d in mydef:
                if isinstance(d, dict) and 'rate' not in d:
                    d['rate'] = pm[(d['from'], d['to'])]

            self.unexpanded_obs_var_def.append(mydef)


        self.obs_var_def = self.expand_obs_var_def(self.unexpanded_obs_var_def, self.unexpanded_proc_model)


        ##contextualize
        if 'model' in context and 'space' in context['model'] and 'type' in context['model']['space'] and 'external' in context['model']['space']['type']:
            contextualize(self.par_proc, self.proc_model, self.obs_var_def)



    def undrift_proc_model(self, proc_model):
        """
        replace drift(arg1, arg2) by arg1 in a copy of proc_model (pm)

        and collects all the arg1 and arg2
        """

        pm = copy.deepcopy(proc_model)
        drift_par_proc = []
        vol_par_proc = []

        for i, r in enumerate(proc_model):
            if 'drift(' in r['rate']:
                rl = self.change_user_input(r['rate'])
                ind_drift = rl.index('drift')
                ind_arg1 = ind_drift + 2 #skip (
                ind_arg2 = ind_drift + 4 #skip ,

                drift_par_proc.append(rl[ind_arg1])
                vol_par_proc.append(rl[ind_arg2])
                pm[i]['rate'] = r['rate'].replace(' ', '') #remove spaces
                pm[i]['rate'] = pm[i]['rate'].replace('drift({0},{1})'.format(rl[ind_arg1], rl[ind_arg2]), rl[ind_arg1])


        return (pm, drift_par_proc, vol_par_proc)


    def undrift_obs_model(self, obs_model):
        """
        replace drift(arg1, arg2) by arg1 in a copy of obs_model (om)

        and collects all the arg1 and arg2
        """

        om = copy.deepcopy(obs_model)
        drift_par_obs = []
        vol_par_obs = []

        for k, v in obs_model.iteritems():
            if k != 'dist':
                if 'drift(' in v:
                    rl = self.change_user_input(v)
                    ind_drift = rl.index('drift')
                    ind_arg1 = ind_drift + 2 #skip (
                    ind_arg2 = ind_drift + 4 #skip ,

                    drift_par_obs.append(rl[ind_arg1])
                    vol_par_obs.append(rl[ind_arg2])

                    om[k] = v.replace(' ', '') #remove spaces
                    om[k] = om[k].replace('drift({0},{1})'.format(rl[ind_arg1], rl[ind_arg2]), rl[ind_arg1])

        return (om, drift_par_obs, vol_par_obs)



    def change_user_input(self, reaction):
        """transform the reaction in smtg that we can parse in a programming language:
        example: change_user_input('r0*2*correct_rate(v)') -> ['r0', '*', '2', 'correct_rate', '(', 'v', ')']"""

        myreaction=reaction.replace(' ','') ##get rid of whitespaces
        mylist=[]
        mystring=''

        for i in range(len(myreaction)):

            if myreaction[i] in self.op :
                if len(mystring)>0:
                    mylist.append(mystring)
                    mystring=''
                mylist.append(myreaction[i])
            else:
                mystring += myreaction[i]

        if len(mystring)>0: ##the string doesn't end with an operator
            mylist.append(mystring)

        return mylist



    def change_rate_erlang(self, rate, state_shape_erlang):
        """fix the rates e.g. I -> (I0+I1+I2)"""

        myrate = self.change_user_input(rate)
        for s in state_shape_erlang:
            if s[0] in myrate:
                myrate = map(lambda x: '({0})'.format('+'.join([s[0]+str(x) for x in range(s[1])])) if x==s[0] else x, myrate)
        return ''.join(myrate)


    def expand_par_sv(self, par_sv, proc_model):
        """expand the list of state variable par_sv"""

        indg = [i for i, reac in enumerate(proc_model) if reac['from']==reac['to']] #index of reaction with erlang transitions
        par_sv_expanded = copy.deepcopy(par_sv)

        for i in indg:
            s = proc_model[i]['from']
            if s in par_sv: #need this condition so that the method can be used to expand transmission tags
                offset = par_sv_expanded.index(s)
                par_sv_expanded.remove(s)

                for j in range(proc_model[i]['tag'][0]['shape']):
                    par_sv_expanded.insert(offset+j, s+str(j))

        return par_sv_expanded



    def expand_proc_model(self, proc_model):
        """expand process model
        TODO: generalize to a list of tags
        """

        model_expanded = copy.deepcopy(proc_model)

        indg = []
        state_shape_erlang = []
        state_erlang = []

        for i, r in enumerate(proc_model):
            if r['from'] == r['to']:
                indg.append(i)
                state_shape_erlang.append([r['from'], r['tag'][0]['shape']])
                state_erlang.append(r['from'])
            elif 'tag' in r and r['tag'][0]['id'] == 'transmission':
                ##expand by of transmission tags
                model_expanded[i]['tag'][0]['by'] = self.expand_par_sv(r['tag'][0]['by'], proc_model)

        model_erlang = []

        ###v -> v*k
        for i in range(len(model_expanded)):
            for j in indg:
                if (proc_model[j]['rate'] in model_expanded[i]['rate']) and (model_expanded[i]['from'] in state_erlang) :
                    model_expanded[i]['rate'] = model_expanded[i]['rate'].replace(proc_model[j]['rate'], '({0})*{1}.0'.format(proc_model[j]['rate'], proc_model[j]['tag'][0]['shape'] ))

        for i in indg:
            reac = model_expanded[i]

            myexit = [i for i, exitreac in enumerate(model_expanded) if exitreac['from'] == reac['from'] and exitreac != reac]
            for e in myexit:
                if (reac['rate'] in model_expanded[e]['rate']) and (model_expanded[e]['to'] != 'U' ):
                    for j in range(reac['tag'][0]['shape'] - 1):
                        model_erlang.append({'from': reac['from'] + str(j), 'to': reac['from'] + str(j+1), 'rate': model_expanded[e]['rate']})
                else:
                    for j in range(reac['tag'][0]['shape'] - 1):
                        model_erlang.append({'from':reac['from'] + str(j), 'to':model_expanded[e]['to'], 'rate': model_expanded[e]['rate']})


            #overwrite exit (from) state variable
            for e in myexit:
                model_expanded[e]['from'] = reac['from']+str(reac['tag'][0]['shape'] - 1)


        ####overwrite arrival (to) state variable e.g S->I becomes S->I0 or I->R becomes I{shape-1}->R
        for i in range(len(model_expanded)):

            if model_expanded[i]['from'] != model_expanded[i]['to']:
                if model_expanded[i]['to'] in state_erlang:
                    model_expanded[i]['to'] = model_expanded[i]['to']+str(0)


        ##delete the erlang reaction and add the expanded one to model...
        model_expanded = [m for m in model_expanded if model_expanded.index(m) not in indg]

        model_expanded.extend(model_erlang)

        #fix the rates e.g. I -> (I0+I1+I2)

        for i in range(len(model_expanded)):
            model_expanded[i]['rate'] = self.change_rate_erlang(model_expanded[i]['rate'], state_shape_erlang)


        return model_expanded


    def expand_obs_var_def(self, obs_var_def, proc_model):
        """expand the observed variables definitions"""

        indg = []
        state_shape_erlang = []
        state_erlang = []

        for i, r in enumerate(proc_model):
            if r['from'] == r['to']:
                indg.append(i)
                state_shape_erlang.append([r['from'], r['tag'][0]['shape']])
                state_erlang.append(r['from'])


        myobs = copy.deepcopy(obs_var_def)

        ##fix the reaction
        for i in range(len(obs_var_def)):

            if not isinstance(obs_var_def[i][0], dict): ##prevalence:
                prev_expanded = []
                for j in range(len(obs_var_def[i])):
                    if myobs[i][j] in state_erlang:
                        prev_expanded.extend( [myobs[i][j] + str(k) for k in range(state_shape_erlang[state_erlang.index(myobs[i][j])][1]) ] )
                    else:
                        prev_expanded.append( myobs[i][j])

                myobs[i] = copy.deepcopy(prev_expanded)

            ##that's it we are done with the prevalence!
            else: ##incidence

                for j in range(len(obs_var_def[i])):
                    myobs[i][j]['rate'] = self.change_rate_erlang(myobs[i][j]['rate'], state_shape_erlang)

                    ###v -> v*k
                    for k in indg:
                        if (proc_model[k]['rate'] in myobs[i][j]['rate']) and (myobs[i][j]['from'] in state_erlang):
                            myobs[i][j]['rate'] = myobs[i][j]['rate'].replace(proc_model[k]['rate'], '({0})*{1}.0'.format(proc_model[k]['rate'], proc_model[k]['tag'][0]['shape'] ))


        ##################################################
        ##We only work on the incidence
        ##################################################

        ##fix from and to:
        ##PART 1: from or to a disease state: simply reroute e.g S->I => S->I0 or I->DU => I{k}->DU
        for i in range(len(obs_var_def)):

            if isinstance(obs_var_def[i][0], dict): ##incidence

                for j in range(len(obs_var_def[i])):

                    if ( (myobs[i][j]['from'] in state_erlang) and (myobs[i][j]['to'] != 'U' ) ) :
                        myobs[i][j]['from'] += str(state_shape_erlang[state_erlang.index(myobs[i][j]['from'])][1]-1)

                    if ( (myobs[i][j]['to'] in state_erlang) and (myobs[i][j]['from'] != 'U' ) ):
                        myobs[i][j]['to'] += str(0)


        ##PART 2: from or to a demographics state: we expand e.g I->U => I0->U + I1->U +...
        ## WARNING:size of myobs change as we pop it....
        myobs_static = copy.deepcopy(myobs)
        for i in range(len(obs_var_def)):

            if isinstance(obs_var_def[i][0], dict): ##incidence

                for j in range(len(obs_var_def[i])):

                    if ( (obs_var_def[i][j]['from'] in state_erlang) and (obs_var_def[i][j]['to'] == 'U' ) ) :
                        myj = myobs[i].index(myobs_static[i][j])

                        myfrom = myobs[i][myj]['from']
                        myrate = myobs[i][myj]['rate']
                        myobs[i].pop(myj)
                        for k in range(state_shape_erlang[state_erlang.index(myfrom)][1]):
                            myobs[i].append({'from': myfrom+str(k), 'to': 'U', 'rate': myrate})

                    if ( (obs_var_def[i][j]['to'] in state_erlang) and (obs_var_def[i][j]['from'] == 'U' ) ) :
                        myj = myobs[i].index(myobs_static[i][j])

                        myto = myobs[i][myj]['to']
                        myrate = myobs[i][myj]['rate']
                        myobs[i].pop(myj)
                        for k in range(state_shape_erlang[state_erlang.index(myto)][1]):
                            myobs[i].append({'from': 'U', 'to': myto+str(k), 'rate': myrate})

        return myobs


if __name__=="__main__":

    """
    test model Erlang expansion and substitution of N in either p_0
    sum_SV or N

    """

    #full model
    m = {}
    m['state'] = [{'id':'S'}, {'id':'I'}]
    m['parameter'] = [{'id':'r0'}, {'id':'v'}, {'id':'e'}, {'id':'d'}, {'id':'sto'}, {'id':'alpha'}, {'id':'mu_b'}, {'id':'mu_d'}, {'id':'vol'}]

    m['model'] = [ {'from': 'U', 'to': 'S',  'rate': 'mu_b*N'},
                   {'from': 'S', 'to': 'I',  'rate': 'noise__trans(sto)*drift(r0, vol_r0)/N*v*sinusoidal_forcing(e,d)*I', "tag":[{"id": "transmission", "by":["I"]}]},
                   {'from': 'S', 'to': 'U',  'rate': 'mu_d'},
                   {'from': 'I', 'to': 'I',  'rate': 'correct_rate(v)', "tag": [{"id": "erlang", "shape":3}], 'desc':'NOTE that the rate is correct_rate(v) and **not** (1-alpha)*correct_rate(v)'},
                   {'from': 'I', 'to': 'DU', 'rate': '(1-alpha)*correct_rate(v)'},
                   {'from': 'I', 'to': 'U',  'rate': 'alpha*correct_rate(v) + mu_d'} ]

    m['pop_size_eq_sum_sv'] = False


    ##context elements needed for Cmodel
    c = {}
    c['model'] = {"space": {"type": ["external"]},
                  "age": None}

    c['data'] = [{'id': 'N'}, {'id': 'mu_b'}, {'id': 'mu_d'}]

    ##link elements needed for Cmodel
    l = {}
    l['observed'] =  [{"id": "Prev",     "definition": ["I"]},
                      {"id": "SI",       "definition": ["S", "I"]},
                      {"id": "Inc_out",  "definition": [{"from":"I", "to":"DU"}, {"from":"I", "to":"U"}]},
                      {"id": "Inc_in",   "definition": [{"from":"S", "to":"I"}]}]

    l['parameter'] = [{"id": "rep"}, {"id": "phi"}]

    l['model'] = {"distribution": "discretized_normal",
                  "mean": "prop*rep*x",
                  "var":  "rep*(1.0-rep)*prop*x + (rep*phi*prop*x)**2"}

    test_model = Cmodel(c, m, l)


    print "par_proc"
    print test_model.par_proc

    print "expanded state variables"
    print test_model.par_sv

    print "test_model.unexpanded_proc_model (undrifted)"
    tmp_print = test_model.unexpanded_proc_model
    for line in tmp_print:
        print line

    print "drift var"
    print test_model.drift_par_proc
    print test_model.vol_par_proc
    print test_model.drift_par_obs
    print test_model.vol_par_obs
    print test_model.drift_var

    print "\nexpanded process model"
    tmp_print = test_model.proc_model
    for line in tmp_print:
        print line

    print "\ntest_model.unexpanded_obs_var_def"
    tmp_print = test_model.unexpanded_obs_var_def
    for line in tmp_print:
        print line

    print "\nexpanded observed variable definition"
    tmp_print = test_model.obs_var_def
    for line in tmp_print:
        print line

    print "\ntest_model.obs_model"
    print test_model.obs_model

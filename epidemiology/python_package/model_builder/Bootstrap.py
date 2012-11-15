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


import os
import os.path
import json
import numpy
import csv
import sys


from django.template import Template, Context
from django.conf import settings
settings.configure()


HEADER = '\033[95m'
OKBLUE = '\033[94m'
OKGREEN = '\033[92m'
WARNING = '\033[93m'
FAIL = '\033[91m'
ENDC = '\033[0m'


def rescale(y,  y_min, y_max, x_min, x_max):

    """
    y ranging from y_min and y_max will be rescaled in between
    x_min and x_max

    """

    return (((y-y_min)/(y_max-y_min)) * (x_max-x_min) + x_min)

def randomLHS(N, K):

    """
    adapted to Python by Sebastien Ballesteros from randomLHS.R
    Function:  randomLHS.R
    Purpose:   This function creates a random latin hypercube design
    Author:    Doug Mooney
    Modified:  Rob Carnell
    Date:      May 05

    Variables:
       N is the number of partitions (simulations or design points)
       K is the number of replication (variables)

    Ex:  randomLHS(4,3) returns a 4x3 matrix with
          each column constructed as follows
          A random permutation of (1,2,3,4)
          is generated, say (3,1,2,4) for each of K columns

          Then a uniform random number is picked from
          each indicated quartile.  In this example a random
          number between .5 and .75 is chosen, then one between
          0 and .25, then one between .25 and .5, finally one between
          .75 and 1.
    """

    tmp = numpy.random.random_sample((N,K))
    P = tmp.argsort(axis=0)
    P = P + numpy.random.random_sample((N,K))

    return (P/ float(N))


def sample_unit_simplex(N, K):

    """
    sample uniformly from the unit simplex of dimension K. Do it N times.

    randomIC is typicaly used to sample random IC (IC are proportion
    between 0 and 1 that have to sum up to 1). You might want to do
    this to check for coexisting attractors when running bifurcation
    analysis


    from: http://geomblog.blogspot.com/2005/10/sampling-from-simplex.html
    It turns out that there is an elegant way of doing this. We
    generate IID random samples from an exponential distribution
    (which you do by sampling X from [0,1] uniformly, and returning
    -log(X)). Take D samples, and then normalize. Voila, the resulting
    list of numbers is a uniform sample from the simplex.

    """

    tmp = -numpy.log(numpy.random.random_sample((N,K)))

    sum_col = numpy.sum(tmp, axis=1) ##sum of the K values
    ##normalize
    for i in range(N):
        tmp[i] /= sum_col[i]

    return tmp



class Bootstrap:

    """
    Simforence Bootstrap

    create settings file to run (offline) latin hyper square,
    likelihood slice, likelihood profile, bifurcation analysis and
    predictability plot.

    For latin hyper square, likelihood slice, likelihood profile and
    bifurcation analysis, we create Simforence best-like
    objects that can be used by sfi to create new settings.json
    files

    For predictability plot, sfi is used to start with the
    reconstructed initial conditions obtained after a run an SMC algo

    """

    def __init__(self, path_settings, path_rendered,  seed = None):

        ##seed the rng to allow design to be replicable
        numpy.random.seed(seed=seed)

        self.path_rendered = path_rendered

        self.path_settings = path_settings

        self.settings = json.load(open(path_settings))

        self.offsets = {'par_sv': 0 }
        self.offsets['par_proc'] = sum(len(self.settings['partition'][self.settings['parameters'][x]['partition_id']]['group']) for x in self.settings['orders']['par_sv'])
        self.offsets['par_obs'] = self.offsets['par_proc'] + sum(len(self.settings['partition'][self.settings['parameters'][x]['partition_id']]['group']) for x in self.settings['orders']['par_proc'])

        self.par_all = self.settings['orders']['par_sv'] + self.settings['orders']['par_proc'] + self.settings['orders']['par_obs']

    def reduce_all(self, what):

        all_reduced = []
        for p in self.par_all:
            all_reduced += [self.settings['parameters'][p][what][k] for k in self.settings['parameters'][p][what]]

        return all_reduced


    def header_best(self):
        """header for a best design"""

        header = ['index']
        for p in self.par_all:
            header += ['{0}:{1}'.format(p, k) for k in self.settings['parameters'][p]['guess']]

        return header


    def get_offset_best(self, parname, group):
        """partype is par_sv, par_proc or par_obs"""

        #determine partype
        partype = ''
        for x in ['par_sv', 'par_proc', 'par_obs']:
            if parname in self.settings['orders'][x]:
                partype = x
                break

        if not partype:
            sys.stderr.write(FAIL + '"{0}" is not a valid parameter name\n'.format(parname) + ENDC)
            sys.exit(1)


        par_type_offset = self.offsets[partype]
        index_par = self.settings['orders'][partype].index(parname)
        index_group = [x['id'] for x in self.settings['partition'][self.settings['parameters'][parname]['partition_id']]['group']].index(group)

        offset = sum(len(self.settings['partition'][self.settings['parameters'][x]['partition_id']]['group']) for x in self.settings['orders'][partype][:index_par])

        offset += par_type_offset + index_group

        return offset

    def path_ppg(self, prefix, parname, group, filename = 'design.des'):

        my_directory = os.path.join(self.path_rendered, 'results', prefix, parname, group)

        if not os.path.exists(my_directory):
            os.makedirs(my_directory)

        return os.path.join(my_directory, filename)



    def linear_1d(self, prefix, parname, group, H=20):

        """
        1D slice, profile or bif analysis
        """

        my_min = self.settings['parameters'][parname]['min'][group]
        my_max = self.settings['parameters'][parname]['max'][group]

        des = numpy.linspace(my_min, my_max, num=H)

        best = self.reduce_all('guess')

        with open(self.path_ppg(prefix, parname, group), "w") as f:

            f.write('\t'.join(self.header_best()) + '\n')

            offset = self.get_offset_best(parname, group)
            for i, d in enumerate(des):
                best[offset] = d
                f.write(str(i+1) +'\t' +  '\t'.join(map(str,best)) + '\n')


    def linear_2d(self, prefix, parname1, parname2, group1, group2, H1=20, H2=20):

        """
        2D slice, profile or bif analysis
        """

        my_min1 = self.settings['parameters'][parname1]['min'][group1]
        my_max1 = self.settings['parameters'][parname1]['max'][group1]

        my_min2 = self.settings['parameters'][parname2]['min'][group2]
        my_max2 = self.settings['parameters'][parname2]['max'][group2]

        des1 = numpy.linspace(my_min1, my_max1, num=H1)
        des2 = numpy.linspace(my_min2, my_max2, num=H2)

        best = self.reduce_all('guess')

        with open(self.path_ppg(prefix, '--'.join([parname1, parname2]), '--'.join([group1, group2])), "w") as f:

            f.write('\t'.join(self.header_best()) + '\n')

            offset1 = self.get_offset_best(parname1, group1)
            offset2 = self.get_offset_best(parname2, group2)

            i = 1
            for d1 in des1:
                best[offset1] = d1
                for d2 in des2:
                    best[offset2] = d2
                    f.write(str(i) +'\t' +  '\t'.join(map(str,best)) + '\n')
                    i += 1



    def lhs(self, prefix, f = [], H=20):

        """
        latin hypersquare sampling of the parameters. Note that the
        LHS is first generated with variable in [0, 1] and then
        rescaled using min and max => if min = max the parameter
        remains constant
        """

        all_min = self.reduce_all('min')
        all_max = self.reduce_all('max')
        all_guess = self.reduce_all('guess')

        my_lhs = randomLHS(H, len(all_guess))


        #replace par_string by parameters index in place
        for i, obj in enumerate(f):
            for x in ['x', 'y']:
                arglist = obj[x].split(':')
                f[i]['offset_' + x] = self.get_offset_best(*arglist)
                f[i]['transf_' + x] = self.settings['parameters'][arglist[0]]['transformation']



        my_directory = os.path.join(self.path_rendered, 'results', prefix)
        if not os.path.exists(my_directory):
            os.makedirs(my_directory)
        filename = 'design.des'

        with open(os.path.join(my_directory, filename), "w") as myfile:

            myfile.write('\t'.join(self.header_best()) + '\n')

            for i, d in enumerate(my_lhs):
                for j in range(len(all_guess)):
                    all_guess[j] = rescale(d[j], 0, 1, all_min[j], all_max[j])

                for t in f:
                    x = all_guess[t['offset_y']] + numpy.random.uniform(low=t['range'][0], high=t['range'][1])
                    #sanitize (if needed)
                    if t['transf_y'] == 'log' and (x<0.0):
                        x = 0.0
                    elif t['transf_y'] == 'logit':
                        if x < 0.0:
                            x = 0.0
                        if x > 1.0:
                            x = 1.0

                    all_guess[t['offset_y']] = x

                myfile.write(str(i+1) +'\t' +  '\t'.join(map(str, all_guess)) + '\n')



    def bash_it(self, action, prefix, cmd, parname=None, group=None, cluster=None, H=20):

        """
        create a bash script to run the design

        """

        t = """{% autoescape off %}#!/bin/bash

{% if cluster.type == 'PBS' %}
#PBS -l nodes={{ cluster.node|default:"1" }}:ppn={{ cluster.cpu|default:"1" }},walltime={{ cluster.walltime|default:"20:00:00" }}
{% if H > 1 %}
#PBS -t 0-{{ H|add:"-1" }}
h=$PBS_ARRAYID
{% else %}
h=0{% endif %}
{% elif cluster.type == 'SGE' %}
{% if H > 1 %}
#$ -t 1-{{ H }}
let h=$SGE_TASK_ID-1
{% else %}
h=0{% endif %}
{% else %}
H={{ H }}{% endif %}

path_bin={{ path.bin }}
path_settings={{ path.settings }}
path_results={{ path.results }}/ #(has to end with a /)
{% if 'design' in path %}path_design={{ path.design }}{% endif %}

cd $path_bin
test -d $path_results || mkdir -p $path_results

{% if not cluster %}
for (( h=0; h < $H; h++ )); do
    echo {{ script_info }}: iteration $h/$H\n{% endif %}
{% for c in cmd %}
{% if c.rep > 1 %}{%if not cluster%}    {%endif%}for (( i=0; i < {{ c.rep }}; i++ )); do{% endif %}
{% if c.rep > 1 %}    {% endif %}{%if not cluster%}    {% endif %}sfi -s $path_settings {{ c.sfi }} | ./{{c.C}} -p $path_results -i $h
{% if c.rep > 1 %}{%if not cluster%}    {%endif%}done{% endif %}{% endfor %}

{% if not cluster %}done{% endif %}
{% endautoescape %}
"""

        c = {}
        c['cluster'] = cluster
        c['H'] = H
        c['script_info'] = ':'.join([prefix, parname, group]) if (parname and group) else prefix
        c['path'] = {}
        c['path']['bin'] = os.path.join(self.path_rendered, 'bin')
        c['path']['results'] = os.path.join(self.path_rendered, 'results', prefix, parname, group) if (parname and group) else os.path.join(self.path_rendered, 'results', prefix)
        c['path']['settings'] = self.path_settings
        c['path']['design'] = os.path.join(self.path_rendered, 'results', prefix, parname, group, 'design.des') if (parname and group) else os.path.join(self.path_rendered, 'results', prefix, 'design.des')


        opts = {'N': '',
                'D': '-B -b $path_design -m $h',
                'X': '-X -x ${path_results}X_${h}.output',
                'B': '-B -b ${path_results}best_${h}.output',
                'DX': '-B -b $path_design -m $h -X -x ${path_results}X_${h}.output',
                'BX': '-B -b ${path_results}best_${h}.output -X -x ${path_results}X_${h}.output'}

        c['cmd'] = []
        for x in cmd:
            c['cmd'].append({'sfi': opts[x[0]] + (' -P $path_design ' if action == 'profile' else ' ' + x[1]),
                             'C': x[2],
                             'rep': x[3] if len(x) > 3 else 1})

        my_template = Template(t)
        my_context = Context(c)


        ##create template
        my_directory = os.path.join(self.path_rendered, 'results', prefix, parname, group) if (parname and group) else os.path.join(self.path_rendered, 'results', prefix)

        if not os.path.exists(my_directory):
            os.makedirs(my_directory)

        path_script = os.path.join(my_directory, 'design.sh')
        with open(path_script, 'w') as f:
            f.write(my_template.render(my_context))
            os.chmod(path_script, 0755)

    def all_lin1d(self, action, prefix, cmd, cluster=None, H=20):

        """
        High level method to create designs and bash scripts to do
        1D slices, profiles or bifurcation analysis on all
        parameters

        """

        all_script = '#!/bin/bash\n\n' ##script that will run all the individual design.sh scripts

        for parname, obj in self.settings['parameters'].iteritems():
            for group in obj['guess']:
                self.linear_1d(prefix, parname, group, H)
                self.bash_it(action, prefix, cmd, parname, group, cluster, H)

                sh = os.path.abspath(os.path.join(self.path_rendered, 'results', prefix, parname, group, 'design.sh'))

                if not cluster:
                    all_script += '{0}\n'.format(sh)
                elif cluster['type'] == 'PBS':
                    all_script += 'qsub {0}\n'.format(sh)
                elif cluster['type'] == 'SGE':
                    all_script += 'qsub -V {0}\n'.format(sh)


        my_directory = os.path.join(self.path_rendered, 'results', prefix)
        if not os.path.exists(my_directory):
            os.makedirs(my_directory)

        path_script = os.path.join(my_directory, 'all.sh')
        with open(path_script, 'w') as f:
            f.write(all_script)
            os.chmod(path_script, 0755)


    ##DEPRECIATED (FOR NOW)
    def bash_bif(self, script_name, design_name,  path_res_from_results, cmd,
                 continuation=False, backward=False, H2=1, cluster=None, path_root_cloud=None, settings_name_cloud="settings", walltime="20:00:00", alloc = (1,1)):

        """
        create a bash script to run a bifurcation analysis
        (depending on a best object located in path_design)

        !!!cluster option can't be used with continuation and backward option (non-sense)!!!'

        """

        if cluster and (continuation==True or  backward==True):
            print('WARNING!! setting continuation and backward option to False: continuation and backward option cannot be used with a cluster')
            continuation=False
            backward=False


        design = [map(float, filter(lambda x:x!='',row)) for row in csv.reader(open(os.path.join(self.path_rendered,  'settings', design_name+'.dat'), 'r'), delimiter='\t', quotechar='"')  if row!=[]]
        H = len(design)

        b = '#!/bin/bash\n\n'

        if cluster == 'PBS':
            b +='#PBS -l nodes={0}:ppn={1},walltime={2}\n\n'.format(alloc[0], alloc[1], walltime)
            b +='#PBS -t 0-{0}\n'.format(H-1)
            b +='h=$PBS_ARRAYID\n'
        elif cluster == 'SGE':
            b +='#$ -t 1-{0}\n'.format(H)
            b +='let h=$SGE_TASK_ID-1\n'
        else:
            b +='H={0}\n'.format(H)

        b += 'path_bin={0}\n'.format(os.path.join(self.path_rendered, 'bin', '') if not path_root_cloud else os.path.join(path_root_cloud, 'bin', ''))
        b += 'path_settings={0}\n'.format(self.path_settings if not path_root_cloud else os.path.join(path_root_cloud, 'settings', settings_name_cloud+'.json'))
        b += 'path_results={0}\n'.format(os.path.join(self.path_rendered if not path_root_cloud else path_root_cloud, 'results', path_res_from_results, ''))
        b += 'path_design={0}.dat\n\n'.format(os.path.join(self.path_rendered if not path_root_cloud else path_root_cloud, 'settings', design_name))


        if continuation:
            b += 'H2={0}\n\n'.format(H2)

        b +='cd $path_bin\n\n'

        b += 'test -d $path_results || mkdir -p $path_results\n\n'

        if backward:
            b +='let Hm1=$H-1\n'
            b +='for (( h=${Hm1}; h >= 0; h-- )); do\n'
        else:
            if not cluster:
                b +='for (( h=0; h < $H; h++ )); do\n'
                b +='\techo {0}.sh: iteration $h/$H\n'.format(script_name)

        if continuation:

            if backward:
                b += '\tif [ $h -eq ${Hm1} ]\n'
            else:
                b += '\tif [ $h -eq 0 ]\n'

            b += '\tthen\n'
            for c in cmd:
                b += '\t\t./sfi -s $path_settings {0} {1} | ./{2} -p $path_results -i $h\n'.format('-B -d -b $path_design -m $h', c[1], c[2])
            b += '\telse\n'

            if H2>1:
                if backward:
                    b += '\t\tlet i=$h+1\n'
                    b += '\t\tif [ $(($i % ${H2}))  -eq 0 ]\n'
                else:
                    b += '\t\tif [ $(($h % ${H2})) -eq 0 ]\n'
                b += '\t\tthen\n'
                b += '\t\t\tinc=${H2}\n'
                b += '\t\telse\n'
                b += '\t\t\tinc=1\n'
                b += '\t\tfi\n\n'

            if backward:
                b += '\t\tlet x=$h+{0}\n'.format('${inc}' if H2>1 else 1)
            else:
                b += '\t\tlet x=$h-{0}\n'.format('${inc}' if H2>1 else 1)

            for c in cmd:
                b += '\t\t./sfi -s $path_settings {0} {1} | ./{2} -p $path_results -i $h\n'.format('-B -d -b $path_design -m $h -X -x ${path_results}X_${x}.output -n 0', c[1], c[2])
            b += '\tfi\n'

        else:
            for c in cmd:
                b +='{0}./sfi {1} {2} | ./{3} -p $path_results -i $h\n'.format('' if cluster else '\t', '-B -d -m $h -s $path_settings -b $path_design', c[1], c[2])

        if not cluster:
            b +='done\n'

        path_script = os.path.join(self.path_rendered, 'bin', script_name+'.sh')
        with open(path_script, "w") as f:
            f.write(b)
            os.chmod(path_script, 0755)


    ##DEPRECIATED (FOR NOW)
    def pred(self, path_hat, script_name='pred', cmd=[('D', '', 'simul deter --traj')], N_EXTRA = 1,
             cluster=None, path_root_cloud=None, path_hat_cloud=None, settings_name_cloud="settings", walltime="20:00:00", alloc = (1,1)):

        """
        create a bash script that generates all the trajectories
        needed for a predictability plot

        """

        N_DATA = self.settings['cst']['N_DATA']

        b = '#!/bin/bash\n\n'

        if cluster == 'PBS':
            b +='#PBS -l nodes={0}:ppn={1},walltime={2}\n\n'.format(alloc[0], alloc[1], walltime)
            b +='#PBS -t 0-{0}\n'.format(N_DATA-1)
            b +='h=$PBS_ARRAYID\n'
        elif cluster == 'SGE':
            b +='#$ -t 1-{0}\n'.format(N_DATA)
            b +='let h=$SGE_TASK_ID-1\n'
        else:
            b +='N_DATA={0}\n'.format(N_DATA)


        b += 'path_bin={0}\n'.format(os.path.join(self.path_rendered, 'bin', '') if not path_root_cloud else os.path.join(path_root_cloud, 'bin', ''))
        b += 'path_settings={0}\n'.format(self.path_settings if not path_root_cloud else os.path.join(path_root_cloud, 'settings', settings_name_cloud+'.json'))
        b += 'path_results={0}\n'.format(os.path.join(self.path_rendered if not path_root_cloud else path_root_cloud, 'results', script_name, ''))
        b += 'path_hat={0}\n\n'.format(path_hat if not path_hat_cloud else path_hat_cloud)

        b +='N_PRED={0}\n\n'.format(N_DATA + N_EXTRA)

        b +='\ncd $path_bin\n\n'
        b += 'test -d $path_results || mkdir -p $path_results\n\n'

        if not cluster:
            b +='for (( h=0; h < $N_DATA; h++ )); do\n'
            b +='\techo {0}.sh: iteration $h/$N_DATA\n'.format(script_name)

        b += '{0}if [ $h -eq 0 ]\n'.format('\t' if not cluster else '')
        b += '{0}then\n'.format('\t' if not cluster else '')
        for c in cmd:
            b +='{0}./sfi -s $path_settings {1} | ./{2} -D $N_PRED -p $path_results -i $h\n'.format('\t' if not cluster else '', c[1], c[2])
            b += '{0}else\n'.format('\t' if not cluster else '')

        b +='{0}let hm1=$h-1\n'.format('\t' if not cluster else '')

        for c in cmd:
            b +='{0}./sfi -s $path_settings {1} {2} | ./{3} -o $h -D $N_PRED -p $path_results -i $h\n'.format('\t' if not cluster else '', '-A -a $path_hat -n ${hm1}', c[1], c[2])

        b += '{0}fi\n'.format('\t' if not cluster else '')

        if not cluster:
            b +='done\n'

        with open(os.path.join(self.path_rendered, 'bin', script_name+'.sh'), "w") as f:
            f.write(b)


if __name__=="__main__":

    path_rendered = os.path.join(os.getenv("HOME"), 'plom_test_model')

    bootstrap = Bootstrap(path_settings = os.path.join(path_rendered, 'settings', 'settings.json'),
                             path_rendered = path_rendered)

    bootstrap.linear_1d('slice', 'r0', 'city1__all')
    bootstrap.linear_2d('slice', 'r0', 'v', 'city1__all', 'all')
    bootstrap.lhs('lhs')

    bootstrap.bash_it("profile", "prof", [['D', '', 'mif', 12]], 'r0', 'city1__all',  None, 20)
    bootstrap.all_lin1d('lhs', 'lhs', [['D', '', 'mif', 12], ['D', '', 'kmcmc', 23], ['D', '', 'pmcmc']], None)

    bootstrap.all_lin1d('profile', 'cloudprofile', [['D', '', 'mif', 12], ['D', '', 'kmcmc', 23], ['D', '', 'pmcmc']], {'type':'SGE', 'cpu':1, 'node':10})

    sample_unit_simplex(N=5, K=2)

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

def get_obs2ts(self):
    """get obs2ts: list with for every obs_var:
    -n_ts_unique
    for every n_ts_unique:
    -n_stream
    -n_cac
    -cac (list of tuples containing index of cities and age classes aggregated in the time serie)

    NOTE: this function assume that data have been sorted by self.obs_var and stream
    """

    obs2ts = []

    for o in self.obs_var:

        ind_ts_o = [self.ts_id.index(x) for x in self.ts_id if self.map_ts_obs[x] == o]
        ts_o = [self._repeated_name_ts[x] for x in ind_ts_o]

        ts_o_unique = [] ##we can't use set(ts_o) as we need to preserve order
        for e in ts_o:
            if e not in ts_o_unique:
                ts_o_unique.append(e)

        n_ts_o_unique = len(ts_o_unique)

        info_o = {}
        info_o['n_ts_unique'] = n_ts_o_unique
        info_o['n_stream'] = []
        info_o['n_cac'] = []
        info_o['cac'] = []

        for ts_o_u in ts_o_unique:
            ind_ts_o_u = [ ind_ts_o[i] for i, x in enumerate(ts_o) if x == ts_o_u ]
            stream_ts_o_u = [ self._repeated_name_stream[x] for x in ind_ts_o_u ]
            n_stream_ts_o_u = len(set(stream_ts_o_u))

            cac_ts_o_u = self.map_ts_cac[ self.ts_id[ ind_ts_o_u[0] ] ] ##all ts from ind_ts_o_u have the same cac
            n_cac_ts_o_u = len(cac_ts_o_u)

            info_o['n_stream'].append(n_stream_ts_o_u)
            info_o['n_cac'].append(n_cac_ts_o_u)
            info_o['cac'].append( [(self.cities_id.index(x.split('__')[0]), self.ages_id.index(x.split('__')[1]))  for x in cac_ts_o_u]  )

        obs2ts.append(info_o)


    return obs2ts



def make_settings_json(self):

    settings = {}

    settings['POP_SIZE_EQ_SUM_SV'] = self.pop_size_eq_sum_sv

    #######parameters settings
    settings['parameters'] = self.values
    settings['partition'] = self.partition

    #######data
    settings['data'] = {}

    ##data/obs2ts
    settings['data']['obs2ts'] = get_obs2ts(self)

    ##data/data (be sure to have sorted the context before this part)
    settings['data']['pop_size_t0'] = self.pop_size_t0
    settings['data']['data'] = self.data
    settings['data']['rep1'] = self.prop
    settings['data']['par_fixed_values'] = self.par_fixed_values

    ##TO DO
    ##settings['data']['school_terms'] = self.school_terms
    settings['data']['dates'] = self.dates

    ##data/drift
    all_order = self.par_sv + self.par_proc + self.par_obs
    settings['data']['drift'] = {'ind_par_Xdrift_applied': [ all_order.index(x) for x in self.drift_par_proc + self.drift_par_obs ],
                                 'ind_volatility_Xdrift': [ all_order.index(x) for x in self.vol_par_proc + self.vol_par_obs ]}

    #######cst settings
    settings['cst'] = {'N_C': self.N_C,
                       'N_AC': self.N_AC,
                       'N_PAR_PROC': len(self.par_proc),
                       'N_PAR_OBS': len(self.par_obs),
                       'N_PAR_SV':  len(self.par_sv),
                       'N_PAR_FIXED':  len(self.par_fixed),
                       'N_TS': self.N_TS,
                       'N_TS_INC': self.N_TS_INC,
                       'N_TS_INC_UNIQUE': self.N_TS_INC_UNIQUE,
                       'N_DATA': self.N_DATA,
                       'N_DATA_PAR_FIXED': self.N_DATA_PAR_FIXED,
                       'N_OBS_ALL': len(self.obs_var_def),
                       'N_OBS_INC': len([x for x in self.obs_var_def if isinstance(x[0], dict)]),
                       'N_OBS_PREV': len([x for x in self.obs_var_def if not isinstance(x[0], dict) ]),
                       'FREQUENCY': self.frequency,
                       'DELTA_STO': {'D':2.0, 'W':14.0, 'M':61.0, 'Y':730.0}[self.frequency],
                       'ONE_YEAR_IN_DATA_UNIT': {'D':365.0, 'W':365.0/7.0, 'M':12.0, 'Y':1.0 }[self.frequency],
                       'N_DRIFT_PAR_PROC':len(self.drift_par_proc),
                       'N_DRIFT_PAR_OBS':len(self.drift_par_obs),
                       'IS_SCHOOL_TERMS':1 if any(map(lambda x: 'terms_forcing' in x, [r['rate'] for r in self.proc_model])) else 0}

    #######order settings (be sure to have sorted the context before this part)
    settings['orders'] = {}
    settings['orders']['par_sv'] = self.par_sv
    settings['orders']['par_proc'] = self.par_proc
    settings['orders']['par_fixed'] = self.par_fixed
    settings['orders']['par_obs'] = self.par_obs
    settings['orders']['ts_id'] = self.ts_id
    settings['orders']['cac_id'] = self.cac_id
    settings['orders']['drift_var'] = self.drift_var

    return json.dumps(settings)

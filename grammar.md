plom.io/epidemiology grammar
==================

- `id` properties at the root of context, process and link objects are
  optional.
- `comment` properties are optional and can be placed anywhere

context.json
============

    {
     "id": "my_id",
     "comment": "my comment",
    
     "population": [{"id": "city1__all",
                     "size_t0": 1e6,
                     "comment": "city 1, all age classes"},
                    {"id": "city2__all",
                     "size_t0": 1e5,
                     "comment": "city 2, all age classes"}],
    
     "time_series": [{"id": "all__CDC__inc",
                      "population_id": ["city1__all", "city2__all"],
                      "comment": ""},
                     {"id": "city1__CDC__prev",
                      "population_id": ["city1__all"],
                      "comment": ""},
                     {"id": "city2__CDC__inc",
                      "population_id": ["city2__all"],
                      "comment": ""},
                     {"id": "all__google__inc",
                      "population_id": ["city1__all", "city2__all"],
                      "comment": ""}],
    
     "frequency": "W",
    
     "data": [{"id": "data",
               "source": "data/data.csv",
               "comment": "my data"},
    
              {"id": "prop",
               "source": "data/prop.csv",
               "comment": "proportion of the population under surveillance"},
              
              {"id": "N",
               "source": "data/N.csv",
               "comment": "population size"},
              {"id": "mu_b",
               "source": "data/mu_b.csv",
               "comment": "birth rates"},
              {"id": "mu_d",
               "source": "data/mu_d.csv",
               "comment": "death rates"}],
    
     "model": {"space": {"type": ["external"]},
               "age": {}}
     }


in `data` 2 objects are mandatory: 
 - `{"id": "data", ...}` 
 - `{"id": "prop", ...}`

frequency is either (same notation are used for parameter unit in link):
- `D`
- `W`
- `M`
- `Y`

process.json
==========

    {
     "id": "SIR",
     "comment": "SIR model with birth and death processes, Erlang distributed duration of infection and noise on the transmission term",
    
     "state": [{"id": "S", "comment": "Susceptible"},
               {"id": "I", "comment": "Infectious"}],
    
     "parameter": [{"id": "r0",   "comment": "basic reproduction number"},
                   {"id": "v",    "comment": "recovery rate"},
                   {"id": "sto",  "comment": "noise intensity"},
                   {"id": "mu_b", "comment": "birth rate"},
                   {"id": "mu_d", "comment": "death rate"}],
    
     "model": [{"from": "U", "to": "S",  "rate": "mu_b*N", "comment":"birth"},
               {"from": "S", "to": "I",  "rate": "noise__trans(sto)*r0/N*v*I", "tag":[{"id": "transmission", "by":["I"]}], "comment":"infection with noise on r0"},
               {"from": "I", "to": "DU", "rate": "v", "comment":"recovery"},
               {"from": "I", "to": "I",  "rate": "v", "tag":[{"id": "erlang", "shape":2}], "comment":"erlang waiting time"},
               {"from": "S", "to": "U",  "rate": "mu_d", "comment":"death"},
               {"from": "I", "to": "U",  "rate": "mu_d", "comment":"death"}],
    
     "pop_size_eq_sum_sv": false
    }

reserved key words:
- `x`
- `U`
- `DU`
- `p_0`
- `sum_SV`
- `N`
- `prop` 

tags id:
- `trans`
- `erlang`

special functions:
- `noise__<name>(noise_intensity)`
- `terms_forcing(amplitude)`
- `sinusoidal_forcing(amplitude, dephasing)`
- `step`,
- `step_lin`,
- `noise`,
- `drift`,
- `correct_rate`


link.json
=========

    {
     "id": "my_id",
     "comment": "my comment",
    
     "observed": [{"id": "prev", "comment":"prevalence",
                   "definition": ["I"],
                   "time_series_id": ["city1__CDC__prev"]},
                  {"id": "inc_out", "comment":"incidence (including death) measured at recovery time",
                   "definition": [{"from":"I", "to":"DU"}, {"from":"I", "to":"U"}],
                   "time_series_id": ["all__CDC__inc", "all__google__inc"]},
                  {"id": "inc_in", "comment":"incidence measured at infection time",
                   "definition": [{"from":"S", "to":"I"}],
                   "time_series_id": ["city2__CDC__inc"]}],
     
     "parameter": [{"id": "rep", "comment": "reporting rate"},
                   {"id": "phi",  "comment": "over-dispertion"}],
     
     "model": {"distribution": "discretized_normal",
               "mean": "prop*rep*x",
               "var": "rep*(1.0-rep)*prop*x + (rep*phi*prop*x)**2"},

     "partition": {"data_stream": {"group": [{"id": "CDC",    "time_series_id": ["all__CDC__inc", "city1__CDC__prev", "city2__CDC__inc"]},
                                             {"id": "google", "time_series_id": ["all__google__inc"]}],
                                   "comment": "split by data stream"}},

     "value": {"S": {"partition_id": "variable_population", "transformation": "logit",
                      "min":   {"city1__all": 0.01, "city2__all": 0.01},
                      "guess": {"city1__all": 0.06, "city2__all": 0.07},
                      "max":   {"city1__all": 0.1,  "city2__all": 0.1},
                      "sd_transf":   {"city1__all": 0.0,  "city2__all": 0.0}},
               "I": {"partition_id": "identical_population", "transformation":"logit",
                     "min": 7e-7, "guess": 1e-05, "max": 1e-3,
                     "sd_transf": 3e-6},
   
               "r0": {"partition_id": "variable_population", "transformation": "log",
                      "min": 10.0, "guess": 20.0, "max": 30.0,
                      "sd_transf": 0.02},
               "v": {"partition_id": "identical_population", "transformation": "log", "unit": "D", "type": "rate_as_duration",
                     "min": 5, "guess": 11, "max": 20,
                     "sd_transf": 0.5},
               "sto": {"partition_id": "identical_population", "transformation": "log",
                       "min": 0.05, "guess": 0.1, "max": 0.2,
                       "sd_transf": 0.0},
   
               "rep": {"partition_id": "identical_time_series", "transformation": "logit",
                       "min": 0.2, "guess":0.6, "max": 0.9,
                       "sd_transf": 0.0},
               "phi": {"partition_id": "data_stream", "transformation":"log",
                        "min":   {"CDC": 0.1, "google": 0.1},
                        "guess": {"CDC": 0.1, "google": 0.2},
                        "max":   {"CDC": 0.3, "google": 0.3},
                        "sd_transf": {"CDC": 0.02, "google": 0.02}}}
    }


groups: "grp" is a **list** of {}. The reason is that it allows to
have an well defined order for the groups (not necessarily useful but we never know:?).

4 built in partitions:
- 'variable_population'
- 'variable_time_series'
- 'identical_population'
- 'identical_time_series'


observation models (`model`):
- `discretized_normal`

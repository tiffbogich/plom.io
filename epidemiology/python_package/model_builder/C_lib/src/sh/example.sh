#!/bin/bash

##To run on a PBS or SGE cluster:
##1) remove the for loop on h and replace it with h=$PBS_ARRAYID for PBS or let h=$SGE_TASK_ID-1 for SGE (SGE array job starts at 1...)
##2) run: qsub -t id_min-id_max this_script.sh

#PBS -S /bin/bash
#PBS -l nodes=1:ppn=1,walltime=01:02:00

H=1000
R=19

design_path=~/Desktop/hfmdJ/lhs.dat
bin_path=~/Desktop/hfmdJ/bin/

cd $bin_path

for (( h=0; h < $H; h++ )); do
	echo iteration $h/$H

	##get IC (IC are in X_$i.output) turning off seasonal forcing
	../src/python/sfr.py -B -d -b $design_path -M $h \
	    -S par_proc___e___guess___all___0.0 \
	    | ./simul_deter -T 100000 -D 1 -i $h 

	##rescale rep2 and do simplex starting from IC computed
	##before. Jump sizes for the IC are set automaticaly with the
	##-L option
	##we also fix phi as the simplex does not allow for
	##demographic stochasticity
	../src/python/sfr.py -B -d -b $design_path -M $h -X -x ${bin_path}X_${h}.output \
	    -L 4.0 \
	    -r rep2 \
	    -S par_proc___sto_SSIS_SSSI_SRIR_RSRI___jump_size___all___0.0 \
	    -S par_obs___phi___jump_size___all___0.0 \
	    -S par_obs___phi___guess___all___0.1 \
	    | ./simplex -M 10000 -l 1e-60 -S 1e-10 -i $h

	##chain simplex algo (each time restarting from the results of the previous one). Note the results are overwritten
	##note also that we have to re set jump_size to 0.0 as they do not end up in best_.output file
	for (( r=0; r < $R; r++ )); do
	    ../src/python/sfr.py -B -b ${bin_path}best_${h}.output \
		-L 4.0 \
		-S par_proc___sto_SSIS_SSSI_SRIR_RSRI___jump_size___all___0.0 \
		-S par_obs___phi___jump_size___all___0.0 \
		-S par_obs___phi___guess___all___0.1 \
		| ./simplex -M 10000 -l 1e-60 -S 1e-10 -i $h
	done

	##save results
#	../src/python/sfr.py -B -b ${bin_path}best_${h}.output > mle_${h}.json

	##plot trajectory
#	./smc_deter_traj -t -J 1 -i $h < mle_${h}.json
done


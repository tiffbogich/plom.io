#!/bin/bash

################################################
##  how to use (special thanks to Dennis McRitchie @princeton):
##
##  1) Replace the 'N' in the '#PBS -l' line and the mpirun line with the number of *worker* nodes you want to run with.
##  2) Replace 'HH' in the '#PBS -l' line with the number of hours of walltime you anticipate needing.
##  3) Replace [master_app_path] and [worker_app_path] in the mpirun line with the absolute path of these applications (unless they reside in the current working directory of the qsub command, in which case you can simply provide the application name). You can follow either of these app paths with any needed command line arguments.
##  4) The '>zmq.${PBS_JOBID}' will store all the master and worker output sent to standard out in a uniquely named file. This is optional. If not specified, the standard output will go to the job's default output file.
################################################


#PBS -l nodes=1:ppn=1+N:ppn=12,walltime=HH:00:00
#PBS -m abe

# Change to the current working directory of the qsub command.
cd $PBS_O_WORKDIR

# Look for the node with a single core allocated, and save it in the master file.
mnode=`sort $PBS_NODEFILE | uniq -c | awk '{ if ($1 == 1) print $2 }'`
echo $mnode >master
# Save all the other nodes/cores in the workers file.
grep -v $mnode $PBS_NODEFILE >workers

# Make mpirun available
module load openmpi


# wrap executable to allow for stdin redirection on every ranks (currently not supported by mpirun -stdin option of mpirun redirect stdin only to the processes with rank 0)
echo -e "#!/bin/bash\n /home/sballest/test_model/bin/smc_zmq -J 1200 -P 1 -C 12 < /home/sballest/test_model/settings.json" > mprog
echo -e "#!/bin/bash\n /home/sballest/test_model/bin/sfr_worker_deter -J 12 -P 12 -I $mnode < /home/sballest/test_model/settings.json" > wprog
chmod +x mprog
chmod +x wprog

# Start up the master and workers.
mpirun -bynode -np 1 -hostfile master mprog : -np 2 -hostfile workers wprog > zmq.${PBS_JOBID}

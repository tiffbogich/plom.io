CC=gcc
CFLAGS=-fopenmp -std=gnu99 -Wall -O3 -I ../core/ -I ../pmcmc/ -DGSL_RANGE_CHECK_OFF
LDFLAGS=-lplom -lm -lgsl -lgslcblas -ljansson -lzmq
EXEC=kalman ksimplex kmcmc
ALL_SRC= $(wildcard *.c)
SRC=$(filter-out main.c simplex_kalman.c kmcmc_main.c kmcmc.c, $(ALL_SRC))
OBJ= $(SRC:.c=.o)
BINDIR=../../../bin

all: $(EXEC)

kalman: $(OBJ) main.o
	$(CC) $(CFLAGS) -L../../../lib -o $@ $^ $(LDFLAGS)

ksimplex: $(OBJ) simplex_kalman.o
	$(CC) $(CFLAGS) -L../../../lib -o $@ $^ $(LDFLAGS)

kmcmc: $(OBJ) kmcmc_main.o kmcmc.o ../pmcmc/methods.o ../pmcmc/build.o ../pmcmc/pmcmc.o
	$(CC) $(CFLAGS) -L../../../lib -o $@ $^ $(LDFLAGS)

%.o: %.c kalman.h pmcmc.h
	$(CC) $(CFLAGS) -o $@ -c $<

.PHONY: clean mrproper install

install:
	test -d $(BINDIR) || mkdir $(BINDIR); mv $(EXEC) $(BINDIR)/

clean:
	rm *.o

mrproper: clean
	rm $(BINDIR)/$(EXEC)

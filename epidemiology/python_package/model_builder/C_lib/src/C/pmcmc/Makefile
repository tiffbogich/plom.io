CC=gcc
CFLAGS=-fopenmp -std=gnu99 -Wall -O3 -I ../core/ -DGSL_RANGE_CHECK_OFF
LDFLAGS=-lplom -lm -lgsl -lgslcblas -ljansson -lzmq
EXEC=pmcmc
SRC= $(wildcard *.c)
OBJ= $(SRC:.c=.o)
BINDIR=../../../bin

all: $(EXEC)

$(EXEC): $(OBJ)
	$(CC) $(CFLAGS) -L../../../lib -o $@ $^ $(LDFLAGS)

%.o: %.c pmcmc.h
	$(CC) $(CFLAGS) -o $@ -c $<

.PHONY: clean mrproper install

install:
	test -d $(BINDIR) || mkdir $(BINDIR); mv $(EXEC) $(BINDIR)/

clean:
	rm *.o

mrproper: clean
	rm $(BINDIR)/$(EXEC)

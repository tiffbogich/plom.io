CC=gcc
CFLAGS=-fopenmp -std=gnu99 -Wall -O3 -DGSL_RANGE_CHECK_OFF
LDFLAGS=-lm -lgsl -lgslcblas -ljansson -lzmq
LIB=libplom.a
SRC= $(wildcard *.c)
#LIB_SRC=$(filter-out main.c, $(ALL_SRC))
OBJ= $(SRC:.c=.o)
LIBDIR=../../../lib

all: $(EXEC) $(LIB)

$(LIB): $(OBJ)
	ar -rcs $@ $(OBJ)

%.o: %.c simforence.h
	$(CC) $(CFLAGS) -o $@ -c $<

.PHONY: clean mrproper install

install:
	test -d $(LIBDIR) || mkdir $(LIBDIR); mv $(LIB) $(LIBDIR)/

clean:
	rm *.o

mrproper: clean
	rm $(LIBDIR)/$(LIB)

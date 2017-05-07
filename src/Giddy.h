#ifndef Giddy_h
#define Giddy_h

#include <SPI.h>
#include "DisplayController.h"

class Giddy {
    public:
        Giddy();
        void setup();
        void process();

    private:
        DisplayController _displayController;
};

#endif
// Define pin numbers for each of the LEDS
// #define N  3
// #define NE 5
// #define E  6
// #define SE 9
// #define S  10
// #define SW 11
// #define W  12
// #define NW 2

#define NUMBER_OF_LEDS 8
int ledPinNumbers[NUMBER_OF_LEDS] = {3, 5, 6, 9, 10, 11, 12, 2};

int newData = -1, currentData = -1, i, val, lastVal = 0;

void setup() 
{
  // Set LED pins as outputs
  for (i = 0; i < NUMBER_OF_LEDS; i++) 
  {
    pinMode(ledPinNumbers[i], OUTPUT);
  }
  turnOffAllLeds();

  // Serial used by bluetooth module
  Serial.begin(9600);
}

void loop() 
{
  newData = listenBluetooth();
  if (newData != currentData && 
      newData >= 0 && 
      newData <= 8) 
  {
    currentData = newData;

    if (currentData == 8) 
    {
      turnOnAllLeds();
    }
    else 
    {
      turnOffAllLeds();
      digitalWrite(ledPinNumbers[currentData], HIGH);
    }
  }
}

int listenBluetooth() 
{
  if (Serial.available() > 0)
  {
    val = Serial.read();

    if (val == 10) // New line character
    {
      lastVal = lastVal - 48; 
      return lastVal;
    }  
    lastVal = val;
  }
}

void turnOffAllLeds() 
{
  for (i = 0; i < NUMBER_OF_LEDS; i++) 
  {
    digitalWrite(ledPinNumbers[i], LOW);
  }
}

void turnOnAllLeds() 
{
  for (i = 0; i < NUMBER_OF_LEDS; i++) 
  {
    digitalWrite(ledPinNumbers[i], HIGH);
  }
}



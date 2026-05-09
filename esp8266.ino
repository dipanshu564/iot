#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <DHT.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// WiFi credentials
const char* ssid = "ABC";
const char* password = "qwertyuiop";

// Server URL (replace with your Render URL)
const char* serverUrl = "https://iot-vgjm.onrender.com";

// DHT
#define DHTPIN D5
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

// LCD
LiquidCrystal_I2C lcd(0x27, 16, 2);

void setup() {
  Serial.begin(115200);
  dht.begin();
  
  // LCD init
  Wire.begin(D1, D2);
  lcd.init();
  lcd.backlight();
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("CONNECTING TO");
  lcd.setCursor(0, 1);
  lcd.print("WiFi");
  delay(1000);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    lcd.print(".");
  }
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("CONNECTED TO");
  lcd.setCursor(0, 1);
  lcd.print("WiFi");
  delay(2000);
  
  // Welcome
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("-- WELCOME --");
  delay(2000);
}

void loop() {
  // Read DHT
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();
  
  if (isnan(temp) || isnan(hum)) {
    Serial.println("Failed to read from DHT sensor!");
    return;
  }
  
  // Display Temp
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("TEMPERATURE");
  lcd.setCursor(0, 1);
  lcd.print(String(temp) + " 'C");
  delay(2000);
  
  // Display Hum
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("HUMIDITY");
  lcd.setCursor(0, 1);
  lcd.print(String(hum) + "%");
  delay(2000);
  
  // Fetch and display LCD text
  String lcdText = getLcdText();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("SISTec DISPLAY");
  lcd.setCursor(0, 1);
  lcd.print(lcdText);
  delay(3000);
  
  // Send data
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("SENDING DATA TO");
  lcd.setCursor(0, 1);
  lcd.print("WEB SERVER....");
  sendData(temp, hum);
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("DATA SENT...!!");
  delay(1000);
  
  delay(10000); // Wait 10s before next loop
}

String getLcdText() {
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClientSecure client;
    client.setInsecure(); // For HTTPS without cert check
    HTTPClient http;
    http.begin(client, String(serverUrl) + "/api/get-lcd-text");
    int httpCode = http.GET();
    if (httpCode > 0) {
      String payload = http.getString();
      http.end();
      return payload.length() > 16 ? payload.substring(0, 16) : payload;
    }
    http.end();
  }
  return "ERROR";
}

void sendData(float temp, float hum) {
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;
    String url = String(serverUrl) + "/save-data?temp=" + String(temp) + "&hum=" + String(hum);
    http.begin(client, url);
    int httpCode = http.GET();
    if (httpCode > 0) {
      Serial.println("Data sent");
    }
    http.end();
  }
}
# McControl - Stream Deck Plugin

McControl provides an easy to use API-Switch wich sends ON/OFF commands and displays the current state! 
You can use McControl for example to control your Switches in openHab or any restApi when its configured corresponding. 

<br>

### Using McControl

After installing on Stream Deck and opening the Property Inspector you will be able to cofigure McControl. 
In the Property Inspector you can set the Title for simplicity to the Devicename. 
If you wont set a Title, the Title will display the State after properly configured. 

The RestAPI-link suppossed to be set to the main Link to the Rest API like "http://openhab:8080/rest/items/"! 
You should do Configuration that way, because the RestAPI-link will be cached, 
so the next time you pull another McControl into Stream Deck you may not need to set the RestAPI-Link again. 

The ItemName sets the last part of the API-Url, wich means if you set the ItemName to KitchenLights 
the complete Url will be http://openhab:8080/rest/items/KitchenLights! 

Afte you finished the configuration you can simply switch profiles or restart Stream Deck and 
McControl will start an interval of 5 seconds checking the state of the item. 

<br>

### Contact / Issues

Please contact me if you have any Issues, featurerequest or Questions! 
<br>
Visit me: [mitchmckean.com](https://mitchmckean.com/)
<br>
Twitter: [@mitchmckean](https://twitter.com/mitchmckean)
<br>
Mail: mail@mitchmckean.com

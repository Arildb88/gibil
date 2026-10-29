package model.stopPlaces

import jakarta.xml.bind.annotation.XmlAccessType
import jakarta.xml.bind.annotation.XmlAccessorType
import jakarta.xml.bind.annotation.XmlElement

private const val NETEX = "http://www.netex.org.uk/netex"

@XmlAccessorType(XmlAccessType.FIELD)
class Centroid {
    @field:XmlElement(name = "Location", namespace = NETEX)
    val location: AirportLocation? = null
}

@XmlAccessorType(XmlAccessType.FIELD)
class AirportLocation {
    @field:XmlElement(name = "Latitude", namespace = NETEX)
    val latitude: Double? = null

    @field:XmlElement(name = "Longitude", namespace = NETEX)
    val longitude: Double? = null
}

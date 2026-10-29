package controller

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import service.AirportMonitorService
import service.AirportQuayService
import model.AirportIATA

@RestController
@RequestMapping("/api/monitor")
class AirportMonitorController(private val monitor: AirportMonitorService,
    private val airportQuayService: AirportQuayService) {
    data class AirportPosition(val airportCode: String, val latitude: Double, val longitude: Double)

    @GetMapping("/airports")
    fun airports(): List<AirportPosition> {
        val coordinates = airportQuayService.getAirportCoordinates()
        return AirportIATA.entries.mapNotNull { airport ->
            val position = coordinates[airport.name] ?: return@mapNotNull null
            AirportPosition(airport.name, position.first, position.second)
        }
    }

    @GetMapping("/status")
    fun status(): AirportMonitorService.MonitorSnapshot = monitor.snapshot()
}

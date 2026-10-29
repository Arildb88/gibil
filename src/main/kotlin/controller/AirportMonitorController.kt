package controller

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import service.AirportMonitorService

@RestController
@RequestMapping("/api/monitor")
class AirportMonitorController(private val monitor: AirportMonitorService) {
    @GetMapping("/status")
    fun status(): AirportMonitorService.MonitorSnapshot = monitor.snapshot()
}

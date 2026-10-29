package service

import model.AirportIATA
import org.springframework.stereotype.Service
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicReference

/**
 * Read-only snapshot of Gibil's existing polling pipeline.
 * Airport codes come exclusively from AirportIATA.
 */
@Service
class AirportMonitorService {
    data class AirportSnapshot(
        val airportCode: String,
        val lastPollAt: Instant?,
        val changedFlights: Int,
        val fetchStatus: String = "PENDING"
    )
    data class MonitorSnapshot(
        val lastPollStartedAt: Instant?,
        val lastPollFinishedAt: Instant?,
        val lastPollError: String?,
        val totalFlights: Int?,
        val changedFlights: Int,
        val airports: List<AirportSnapshot>,
        val monitorStartedAt: Instant,
        val pollIntervalSeconds: Int = 120,
        val initialDelaySeconds: Int = 420
    )

    private val monitorStartedAt = Instant.now()
    private val airportFetchedAt = ConcurrentHashMap<String, Instant>()
    private val startedAt = AtomicReference<Instant?>(null)
    private val finishedAt = AtomicReference<Instant?>(null)
    private val error = AtomicReference<String?>(null)
    private val total = AtomicReference<Int?>(null)
    private val changed = AtomicReference(0)
    private val airportChanges = ConcurrentHashMap<String, Int>()
    private val fetchStatus = ConcurrentHashMap<String, String>()

    fun airportFetched(code: String) { airportFetchedAt[code] = Instant.now(); fetchStatus[code] = "OK" }
    fun airportFetchFailed(code: String) { airportFetchedAt[code] = Instant.now(); fetchStatus[code] = "ERROR" }

    fun pollStarted() {
        startedAt.set(Instant.now())
        error.set(null)
    }

    fun pollCompleted(totalFlights: Int, changedFlights: Int, affectedAirportCodes: List<String>) {
        total.set(totalFlights)
        changed.set(changedFlights)
        airportChanges.clear()
        affectedAirportCodes.groupingBy { it }.eachCount().forEach { (code, count) ->
            airportChanges[code] = count
        }
        finishedAt.set(Instant.now())
    }

    fun pollFailed(cause: Exception) {
        error.set(cause.message ?: cause.javaClass.simpleName)
        finishedAt.set(Instant.now())
    }

    fun snapshot(): MonitorSnapshot = MonitorSnapshot(
        lastPollStartedAt = startedAt.get(),
        lastPollFinishedAt = finishedAt.get(),
        lastPollError = error.get(),
        totalFlights = total.get(),
        changedFlights = changed.get(),
        airports = AirportIATA.entries.map { code ->
            AirportSnapshot(code.name, airportFetchedAt[code.name], airportChanges[code.name] ?: 0, fetchStatus[code.name] ?: "PENDING")
        },
        monitorStartedAt = monitorStartedAt
    )
}

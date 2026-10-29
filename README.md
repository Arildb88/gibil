# Gibil

> The Sumerian god of fire and smithing.

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=entur_gibil&metric=alert_status)](https://sonarcloud.io/dashboard?id=entur_gibil)
![Github Workflow](https://github.com/entur/gibil/actions/workflows/ci-cd.yml/badge.svg)

Real-time flight data adapter that polls the Avinor XML feed for all Norwegian domestic airports tracked by Avinor, converts flights to SIRI-ET format, resolves NeTEx service journeys, and pushes updates to subscribers via [Anshar](https://github.com/entur/anshar).

## Data flow

```
Avinor XML Feed (airport batches of 5)
        │
        ▼
FlightAggregationService
  ── stitch arrival + departure events into UnifiedFlight chains
  ── filter: 20 min past / 24 h future
        │
        ▼
FlightStateCache
  ── hash-based change detection
        │
        ▼
ServiceJourneyResolver
  ── match against NeTEx timetable data
  ── populate serviceJourneyRef & lineRef
        │
        ▼
SiriETMapper
  ── convert to SIRI EstimatedVehicleJourneys
  ── resolve quay IDs via AirportQuayService
        │
        ▼
SubscriptionManager
  ── push SIRI-ET XML to registered subscribers
  ── auto-terminate after 5 consecutive failures
```

Only domestic flights are processed. Svalbard (LYR) is classified as international by Avinor but treated as domestic by Gibil. Airports are polled in batches every 2 minutes (7-minute initial delay after startup).

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/subscribe` | Register a SIRI-ET subscription (XML body) |
| POST | `/unsubscribe` | Terminate a SIRI-ET subscription (XML body) |

## Configuration

Key properties in `application.properties` (overridable via environment/ConfigMap in Kubernetes):

```properties
avinor.api.base-url-xmlfeed=https://asrv.avinor.no/XmlFeed/v1.0
avinor.api.base-url-airport-names=https://asrv.avinor.no/airportNames/v1.0
entur.api.base-url-stop-places=https://api.entur.io/stop-places/v1/read/stop-places

# Override the NeTEx data directory (defaults to GCP path in cluster)
# org.gibil.extime.data-file=/custom/path/extimeData
```

## Tech stack

- **Kotlin** on **Java 25** with **Spring Boot 4**
- **OkHttp** for API calls, **Kotlinx Coroutines** for concurrent batching
- **JAXB** for XML marshalling (Avinor, SIRI, NeTEx)
- **MockK** + **JUnit 5** for testing, **JaCoCo** + **SonarQube** for coverage
- **Docker** (Alpine + Java 25), **Helm** + **Kubernetes** for deployment
- **GitHub Actions** CI/CD: build, SonarQube scan, Docker build/push, deploy to dev/tst/prd

## Local setup (Windows / PowerShell)

This guide starts from a new Windows installation. The application uses **Java 25**, **Apache Maven**, and **Git**. An IDE such as IntelliJ IDEA is optional.

### 1. Install the prerequisites

1. **Git**: install Git for Windows, then open a new PowerShell window and run `git --version`.
2. **Java Development Kit (JDK) 25**: install a **JDK**, not just a Java Runtime Environment (JRE). For example, use a Java 25 distribution from Eclipse Temurin or another JDK vendor. The project compiles to Java 25 bytecode.
3. **Apache Maven**: install Maven 3.9.x, extract the distribution, and add its `bin` directory to your Windows `Path` environment variable. Maven is the build tool used by this repository; installing Java alone is not sufficient.

Configure the environment variables in **Windows → System Properties → Advanced → Environment Variables**:

- `JAVA_HOME`: the JDK installation directory, **not** its `bin` subdirectory (example: `C:\\Program Files\\Java\\jdk-25`; your actual path may differ).
- `Path`: add `%JAVA_HOME%\\bin` and the `bin` directory of your Maven installation (example: `C:\\Tools\\apache-maven-3.9.x\\bin`).

Close and reopen PowerShell after changing environment variables. Verify:

```powershell
git --version
java -version
javac -version
mvn -version
$env:JAVA_HOME
```

**Expected:** `java` and `javac` report major version **25**; `mvn -version` reports Maven and shows that it is using **Java 25**. If the IDE has its own Project SDK setting, configure that to JDK 25 as well.

### 2. Clone and select the branch

```powershell
git clone https://github.com/Arildb88/gibil.git
cd gibil
git fetch origin
git switch tech_map_visualization
git pull origin tech_map_visualization
```

The **Live Monitor** is currently developed on `tech_map_visualization`; do not assume that the default branch contains these features.

### 3. Build and run tests

From the repository root (the folder containing `pom.xml`):

```powershell
mvn clean test
```

The first build can take longer because Maven downloads Kotlin, Spring Boot, testing libraries, and other dependencies. A successful build ends with `BUILD SUCCESS`.

To package the application and run the full Maven verification lifecycle:

```powershell
mvn clean verify
```

### 4. Start Gibil

```powershell
mvn spring-boot:run
```

Leave the terminal open while the application runs. Spring Boot starts its embedded Tomcat server on **port 8080** by default. Stop it using **Ctrl+C**.

On startup, Gibil downloads NeTEx timetable and airport stop-place data from the configured Google Cloud Storage URLs when running with the default local configuration. Internet access is required for the first build, the data downloads, and the external map tiles.

### 5. Open the endpoints

| URL | Purpose |
| --- | --- |
| `http://localhost:8080/api/monitor/status` | Live Monitor JSON: polling times, counts, and per-airport fetch status |
| `http://localhost:8080/monitor/index.html` | Interactive Gibil Live Monitor map and airport overview |
| `http://localhost:8080/siri` | SIRI-ET XML endpoint |

**Use the explicit `/monitor/index.html` path.** The directory path `/monitor/` may return HTTP 404 because the static directory is not necessarily configured for index-file resolution.

The monitoring JSON can show `lastPollStartedAt: null`, `totalFlights: null`, and `fetchStatus: PENDING` immediately after startup. This is expected: the scheduled polling has a **7-minute initial delay** and subsequently runs every **2 minutes**. The browser refreshes the monitor API every 5 seconds; this is **not** an additional Avinor poll.

The map uses Leaflet and external map tiles. Airport coordinates are currently loaded from an external airport-codes CSV source; the map therefore needs browser network access for those assets. The backend's list of monitored airports is derived from `AirportIATA`, not from a separate frontend airport list.

### Troubleshooting

| Symptom | What to check |
| --- | --- |
| `java` or `javac` is not recognized | Install a JDK 25, set `JAVA_HOME`, update `Path`, and reopen the terminal. |
| `mvn` is not recognized | Install Apache Maven and add its `bin` directory to `Path`. |
| Maven uses the wrong Java version | Check `mvn -version`, `$env:JAVA_HOME`, and `where.exe java`. |
| `mvn clean test` cannot delete a file under `target` | Stop any running Gibil/Java process and IDE test runner, then retry. Windows may lock files still in use. |
| `Port 8080 was already in use` | Stop the other application using port 8080, or configure a different `server.port`. |
| `/monitor/` returns Whitelabel 404 | Open `/monitor/index.html` instead and confirm that `src/main/resources/static/monitor/index.html` exists. |
| Monitor shows `PENDING` and no flight totals | Wait for the initial scheduled poll (approximately 7 minutes after startup). |
| The map is blank or lacks markers | Check the browser developer console and network requests for Leaflet, tiles, and the external airport coordinates source. |
| NeTEx or Avinor requests fail | Check network connectivity and the configured URLs in `src/main/resources/application.properties`. |

For a quick check of the local branch and build environment:

```powershell
git status -sb
git log -1 --oneline
mvn -version
```


package com.ecoflux.config;

import com.ecoflux.service.EcosistemaPersistencePort;
import com.ecoflux.service.InMemoryEcosistemaPersistenceAdapter;
import com.ecoflux.service.InMemoryNivelPersistenceAdapter;
import com.ecoflux.service.InMemoryRankingPersistenceAdapter;
import com.ecoflux.service.MotorLotkaVolterra;
import com.ecoflux.service.MotorLotkaVolterraTemporal;
import com.ecoflux.service.NivelPersistencePort;
import com.ecoflux.service.RankingPersistencePort;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class PersistenceConfig {

    @Bean
    @ConditionalOnMissingBean(EcosistemaPersistencePort.class)
    public EcosistemaPersistencePort inMemoryEcosistemaPersistencePort() {
        return new InMemoryEcosistemaPersistenceAdapter();
    }

    @Bean
    @ConditionalOnMissingBean(MotorLotkaVolterra.class)
    public MotorLotkaVolterra fallbackMotorLotkaVolterra() {
        return new MotorLotkaVolterraTemporal();
    }

    @Bean
    @ConditionalOnMissingBean(NivelPersistencePort.class)
    public NivelPersistencePort inMemoryNivelPersistencePort() {
        return new InMemoryNivelPersistenceAdapter();
    }

    @Bean
    @ConditionalOnMissingBean(RankingPersistencePort.class)
    public RankingPersistencePort inMemoryRankingPersistencePort() {
        return new InMemoryRankingPersistenceAdapter();
    }
}

package com.taoswork.tallycheck.adminsite.conf;

import com.taoswork.tallycheck.admincore.conf.AdminCoreConfig;
import com.taoswork.tallycheck.adminsite.conf.model.SecurityConfig;
import com.taoswork.tallycheck.general.solution.property.RuntimeEnvironmentPropertyPlaceholderConfigurer;
import com.taoswork.tallycheck.general.solution.spring.BeanCreationMonitor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

/**
 * Created by Gao Yuan on 2015/5/14.
 */
@Configuration
@Import({
        AdminCoreConfig.class,
        SecurityConfig.class,
})
public class AdminContextConfigurer {
 //       private static final Logger LOGGER = LoggerFactory.getLogger(AdminContextConfigurer.class);

        @Bean
        RuntimeEnvironmentPropertyPlaceholderConfigurer runtimeEnvironmentPropertyPlaceholderConfigurer(){
                RuntimeEnvironmentPropertyPlaceholderConfigurer runtimePropertyConfigurer = new RuntimeEnvironmentPropertyPlaceholderConfigurer();
                runtimePropertyConfigurer.setPublisherVisible(true);
                return runtimePropertyConfigurer;
        }

        @Bean
        BeanCreationMonitor beanCreationMonitor(){
                return new BeanCreationMonitor("RootAppCtx");
        }
}

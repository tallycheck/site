package com.taoswork.tallycheck.adminsite.conf;

import com.taoswork.tallycheck.adminmvc.api.TallyApiController;
import com.taoswork.tallycheck.general.solution.spring.BeanCreationMonitor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurerAdapter;

/**
 * Created by Gao Yuan on 2015/6/14.
 */
@Configuration
@EnableWebMvc
public class AdminApiConfigurer extends WebMvcConfigurerAdapter {

    @Bean
    BeanCreationMonitor beanCreationMonitor(){
        return new BeanCreationMonitor("AdminApi");
    }

    @Bean
    TallyApiController tallyApiController(){
        return new TallyApiController();
    }
}

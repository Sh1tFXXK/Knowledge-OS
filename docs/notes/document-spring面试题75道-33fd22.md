---
title: "Spring面试题+75道"
source_file: "Spring面试题+75道.pdf"
source_type: "pdf"
source_sha256: "90179b5a98b19b6322e887f9a0150f1ca28d0327741cc22cd65486057e70afcb"
source_pages: 22
source_language: "zh"
imported_at: "2026-07-27"
import_standard_version: 1
import_profile: "question-bank"
section_count: 0
question_count: 35
keywords:
  - "Spring面试题+75道"
categories:
  []
---

# Spring面试题+75道

## 1. 1 什么是spring?

Spring是一个轻量级Java开发框架，最早有Rod Johnson创建，目的是为了解决企业级应用开发
的业务逻辑层和其他各层的耦合问题。它是一个分层的JavaSE/JavaEE full-stack（一站式）轻量级
开源框架，为开发Java应用程序提供全面的基础架构支持。Spring负责基础架构，因此Java开发者
可以专注于应用程序的开发。
Spring最根本的使命是解决企业级应用开发的复杂性，即简化Java开发。
Spring可以做很多事情，它为企业级开发提供给了丰富的功能，但是这些功能的底层都依赖于它的
两个核心特性，也就是依赖注入（dependency injection，DI）和面向切面编程（aspect-
oriented programming，AOP）。
为了降低Java开发的复杂性，Spring采取了以下4种关键策略**
基于POJO的轻量级和最小侵入性编程；
通过依赖注入和面向接口实现松耦合；
基于切面和惯例进行声明式编程；
通过切面和模板减少样板式代码。

## 2. 4 Spring的优缺点是什么？

优点
方便解耦，简化开发
Spring就是一个大工厂，可以将所有对象的创建和依赖关系的维护，交给Spring管理。
AOP编程的支持
Spring提供面向切面编程，可以方便的实现对程序进行权限拦截、运行监控等功能。
声明式事务的支持
只需要通过配置就可以完成对事务的管理，而无需手动编程。
方便程序的测试
Spring对Junit4支持，可以通过注解方便的测试Spring程序。
方便集成各种优秀框架
Spring不排斥各种优秀的开源框架，其内部提供了对各种优秀框架的直接支持（如：Struts、
Hibernate、MyBatis等）。
降低JavaEE API的使用难度
Spring对JavaEE开发中非常难用的一些API（JDBC、JavaMail、远程调用等），都提供了封装，使
这些API应用难度大大降低。
缺点
Spring明明一个很轻量级的框架，却给人感觉大而全
Spring依赖反射，反射影响性能
使用门槛升高，入门Spring需要较长时间

## 3. 6 Spring由哪些模块组成？

Spring 总共大约有 20 个模块， 由 1300 多个不同的文件构成。 而这些组件被分别整合在 核心容
器（Core Container） 、 AOP（Aspect Oriented Programming）和设备支持
（Instrmentation） 、 数据访问与集成（Data Access/Integeration） 、 Web 、 消息
（Messaging） 、 Test 等 6 个模块中。 以下是 Spring 5 的模块结构图：
spring core：提供了框架的基本组成部分，包括控制反转（Inversion of Control，IOC）和依赖
注入（Dependency Injection，DI）功能。
spring beans：提供了BeanFactory，是工厂模式的一个经典实现，Spring将管理对象称为
Bean。
spring context：构建于 core 封装包基础上的 context 封装包，提供了一种框架式的对象访问方
法。
spring jdbc：提供了一个JDBC的抽象层，消除了烦琐的JDBC编码和数据库厂商特有的错误代码解
析， 用于简化JDBC。
spring aop：提供了面向切面的编程实现，让你可以自定义拦截器、切点等。
spring Web：提供了针对 Web 开发的集成特性，例如文件上传，利用 servlet listeners 进行 ioc
容器初始化和针对 Web 的 ApplicationContext。
spring test：主要为测试提供支持的，支持使用JUnit或TestNG对Spring组件进行单元测试和集成
测试。

## 4. 7 Spring 框架中都用到了哪些设计模式？

## 5. 10 Spring 应用程序有哪些不同组件？

Spring 应用一般有以下组件：
接口 - 定义功能。
Bean 类 - 它包含属性，setter 和 getter 方法，函数等。
Bean 配置文件 - 包含类的信息以及如何配置它们。
Spring 面向切面编程（AOP） - 提供面向切面编程的功能。
用户程序 - 它使用接口。

## 6. 11 使用 Spring 有哪些方式？

使用 Spring 有以下方式：
作为一个成熟的 Spring Web 应用程序。
作为第三方 Web 框架，使用 Spring Frameworks 中间层。
作为企业级 Java Bean，它可以包装现有的 POJO（Plain Old Java Objects）。
用于远程使用。

## 7. 1 什么是Spring IOC 容器？

控制反转即IOC (Inversion of Control)，它把传统上由程序代码直接操控的对象的调用权交给容
器，通过容器来实现对象组件的装配和管理。所谓的“控制反转”概念就是对组件对象控制权的转
移，从程序代码本身转移到了外部容器。
Spring IOC 负责创建对象，管理对象（通过依赖注入（DI），装配对象，配置对象，并且管理这
些对象的整个生命周期。

## 8. 3 IOC的优点是什么？

IOC 或 依赖注入把应用的代码量降到最低。
它使应用容易测试，单元测试不再需要单例和JNDI查找机制。
最小的代价和最小的侵入性使松散耦合得以实现。
IOC容器支持加载服务时的饿汉式初始化和懒加载。

## 9. 6 BeanFactory 和 ApplicationContext有什么区别？

BeanFactory和ApplicationContext是Spring的两大核心接口，都可以当做Spring的容器。其中
ApplicationContext是BeanFactory的子接口。
依赖关系
interface Fruit {
public abstract void eat();
}
class Apple implements Fruit {
public void eat(){
System.out.println("Apple");
}
}
class Orange implements Fruit {
public void eat(){
System.out.println("Orange");
}
}
class Factory {
public static Fruit getInstance(String ClassName) {
Fruit f=null;
try {
f=(Fruit)Class.forName(ClassName).newInstance();
} catch (Exception e) {
e.printStackTrace();
}
return f;
}
}
class Client {
public static void main(String a) {
Fruit f=Factory.getInstance("io.github.dunwu.spring.Apple");
if(f!=null){
f.eat();
}
}
}

BeanFactory：是Spring里面最底层的接口，包含了各种Bean的定义，读取bean配置文档，
管理bean的加载、实例化，控制bean的生命周期，维护bean之间的依赖关系。
ApplicationContext接口作为BeanFactory的派生，除了提供BeanFactory所具有的功能外，还提
供了更完整的框架功能：
继承MessageSource，因此支持国际化。
统一的资源文件访问方式。
提供在监听器中注册bean的事件。
同时加载多个配置文件。
载入多个（有继承关系）上下文，使得每一个上下文都专注于一个特定的层次，比如应用的
web层。
加载方式
BeanFactroy采用的是延迟加载形式来注入Bean的，即只有在使用到某个Bean时(调用
getBean())，才对该Bean进行加载实例化。这样，我们就不能发现一些存在的Spring的配置
问题。如果Bean的某一个属性没有注入，BeanFacotry加载后，直至第一次使用调用
getBean方法才会抛出异常。
ApplicationContext，它是在容器启动时，一次性创建了所有的Bean。这样，在容器启动
时，我们就可以发现Spring中存在的配置错误，这样有利于检查所依赖属性是否注入。
ApplicationContext启动后预载入所有的单实例Bean，通过预载入单实例bean,确保当你需
要的时候，你就不用等待，因为它们已经创建好了。
相对于基本的BeanFactory，ApplicationContext 唯一的不足是占用内存空间。当应用程序配置Bean较多
时，程序启动较慢。
创建方式
BeanFactory通常以编程的方式被创建，ApplicationContext还能以声明的方式创建，如使用
ContextLoader。
注册方式
BeanFactory和ApplicationContext都支持BeanPostProcessor、
BeanFactoryPostProcessor的使用，但两者之间的区别是：BeanFactory需要手动注册，而
ApplicationContext则是自动注册。

## 10. 8 ApplicationContext通常的实现是什么？

FileSystemXmlApplicationContext：此容器从一个XML文件中加载beans的定义，XML Bean
配置文件的全路径名必须提供给它的构造函数。
ClassPathXmlApplicationContext：此容器也从一个XML文件中加载beans的定义，这里，你
需要正确设置classpath因为这个容器将在classpath里找bean配置。
WebXmlApplicationContext：此容器加载一个XML文件，此文件定义了一个WEB应用的所有
bean。

构造函数注入 setter 注入
没有部分注入 有部分注入
不会覆盖 setter 属性 会覆盖 setter 属性
任意修改都会创建一个新实例 任意修改不会创建一个新实例
适用于设置很多属性 适用于设置少量属性

## 11. 9 什么是Spring的依赖注入？

控制反转IOC是一个很大的概念，可以用不同的方式来实现。其主要实现方式有两种：依赖注入和
依赖查找依赖注入：相对于IOC而言，依赖注入(DI)更加准确地描述了IOC的设计理念。所谓依赖注
入（Dependency Injection），即组件之间的依赖关系由容器在应用系统运行期来决定，也就是
由容器动态地将某种依赖关系的目标对象实例注入到应用系统中的各个关联的组件之中。组件不做
定位查询，只提供普通的Java方法让容器去决定依赖关系。

## 12. 12 有哪些不同类型的依赖注入实现方式？

依赖注入是时下最流行的IOC实现方式，依赖注入分为接口注入（Interface Injection），Setter方
法注入（Setter Injection）和构造器注入（Constructor Injection）三种方式。其中接口注入由于
在灵活性和易用性比较差，现在从Spring4开始已被废弃。
构造器依赖注入：构造器依赖注入通过容器触发一个类的构造器来实现的，该类有一系列参数，每
个参数代表一个对其他类的依赖。
Setter方法注入：Setter方法注入是容器通过调用无参构造器或无参static工厂 方法实例化bean之
后，调用该bean的setter方法，即实现了基于setter的依赖注入。

## 13. 1 什么是Spring beans？

Spring beans 是那些形成Spring应用的主干的java对象。它们被Spring IOC容器初始化，装配，
和管理。这些beans通过容器中配置的元数据创建。比如，以XML文件中 的形式定义。

## 14. 2 一个 Spring Bean 定义 包含什么？

一个Spring Bean 的定义包含容器必知的所有配置元数据，包括如何创建一个bean，它的生命周
期详情及它的依赖。

## 15. 6 你怎样定义类的作用域？

当定义一个 在Spring里，我们还能给这个bean声明一个作用域。它可以通过bean 定义中的scope
属性来定义。如，当Spring要在需要的时候每次生产一个新的bean实例，bean的scope属性被指
定为prototype。另一方面，一个bean每次使用的时候必须返回同一个实例，这个bean的scope
属性 必须设为 singleton。

## 16. 8 Spring框架中的单例bean是线程安全的吗？

不是，Spring框架中的单例bean不是线程安全的。
spring 中的 bean 默认是单例模式，spring 框架并没有对单例 bean 进行多线程的封装处理。
实际上大部分时候 spring bean 无状态的（比如 dao 类），所有某种程度上来说 bean 也是安全
的，但如果 bean 有状态的话（比如 view model 对象），那就要开发者自己去保证线程安全了，
最简单的就是改变 bean 的作用域，把“singleton”变更为“prototype”，这样请求 bean 相当于
new Bean()了，所以就可以保证线程安全了。
有状态就是有数据存储功能。
无状态就是不会保存数据。

## 17. 9 Spring如何处理线程并发问题？

在一般情况下，只有无状态的Bean才可以在多线程环境下共享，在Spring中，绝大部分Bean都可
以声明为singleton作用域，因为Spring对一些Bean中非线程安全状态采用ThreadLocal进行处

理，解决线程安全问题。
ThreadLocal和线程同步机制都是为了解决多线程中相同变量的访问冲突问题。同步机制采用了
“时间换空间”的方式，仅提供一份变量，不同的线程在访问前需要获取锁，没获得锁的线程则需要
排队。而ThreadLocal采用了“空间换时间”的方式。
ThreadLocal会为每一个线程提供一个独立的变量副本，从而隔离了多个线程对数据的访问冲突。
因为每一个线程都拥有自己的变量副本，从而也就没有必要对该变量进行同步了。ThreadLocal提
供了线程安全的共享对象，在编写多线程代码时，可以把不安全的变量封装进ThreadLocal。

## 18. 11 哪些是重要的bean生命周期方法？ 你能重载它们吗？

有两个重要的bean 生命周期方法，第一个是setup， 它是在容器加载bean的时候被调用。第二
个方法是 teardown 它是在容器卸载类的时候被调用。
bean 标签有两个重要的属性（init-method和destroy-method）。用它们你可以自己定制初始化
和注销方法。它们也有相应的注解（@PostConstruct和@PreDestroy）。

## 19. 12 什么是Spring的内部bean？什么是Spring inner beans？

在Spring框架中，当一个bean仅被用作另一个bean的属性时，它能被声明为一个内部bean。内
部bean可以用setter注入“属性”和构造方法注入“构造参数”的方式来实现，内部bean通常是匿名
的，它们的Scope一般是prototype。

## 20. 13 什么是bean装配？

装配，或bean 装配是指在Spring 容器中把bean组装到一起，前提是容器需要知道bean的依赖关
系，如何通过依赖注入来把它们装配到一起。

## 21. 14 什么是bean的自动装配？

在Spring框架中，在配置文件中设定bean的依赖关系是一个很好的机制，Spring 容器能够自动装
配相互合作的bean，这意味着容器不需要和配置，能通过Bean工厂自动处理bean之间的协作。
这意味着 Spring可以通过向Bean Factory中注入的方式自动搞定bean之间的依赖关系。自动装配
可以设置在每个bean上，也可以设定在特定的bean上。

## 22. 16 使用@Autowired注解自动装配的过程是怎样的？

使用@Autowired注解来自动装配指定的bean。在使用@Autowired注解之前需要在Spring配置文
件进行配置，<context:annotation-config />。
在启动spring IOC时，容器自动装载了一个AutowiredAnnotationBeanPostProcessor后置处理
器，当容器扫描到@Autowied、@Resource或@Inject时，就会在IOC容器自动查找需要的bean，
并装配给该对象的属性。在使用@Autowired时，首先在容器中查询对应类型的bean：
如果查询结果刚好为一个，就将该bean装配给@Autowired指定的数据；
如果查询的结果不止一个，那么@Autowired会根据名称来查找；
如果上述查找的结果为空，那么会抛出异常。解决方法时，使用required=false。

## 23. 17 自动装配有哪些局限性？

自动装配的局限性是：
重写：你仍需用 和 配置来定义依赖，意味着总要重写自动装配。
基本数据类型：你不能自动装配简单的属性，如基本数据类型，String字符串，和类。
模糊特性：自动装配不如显式装配精确，如果有可能，建议使用显式装配。

## 24. 18 你可以在Spring中注入一个null 和一个空字符串吗？

可以。

## 25. 2 怎样开启注解装配？

注解装配在默认情况下是不开启的，为了使用注解装配，我们必须在Spring配置文件中配置
<context:annotation-config/> 元素。

## 26. 8 @RequestMapping 注解有什么用？

@RequestMapping 注解用于将特定 HTTP 请求方法映射到将处理相应请求的控制器中的特定类/
方法。此注释可应用于两个级别：
类级别：映射请求的 URL
方法级别：映射 URL 以及 HTTP 请求方法

## 27. 2 在Spring框架中如何更有效地使用JDBC？

public class Employee {
private String name;
@Autowired
public void setName(String name) {
this.name=name;
}
public string getName(){
return name;
}
}

使用Spring JDBC 框架，资源管理和错误处理的代价都会被减轻。所以开发者只需写statements
和 queries从数据存取数据，JDBC也可以在Spring框架提供的模板类的帮助下更有效地被使用，
这个模板叫JdbcTemplate

## 28. 4 spring DAO 有什么用？

Spring DAO（数据访问对象） 使得 JDBC，Hibernate 或 JDO 这样的数据访问技术更容易以一种
统一的方式工作。这使得用户容易在持久性技术之间切换。它还允许您在编写代码时，无需考虑捕
获每种技术不同的异常。

## 29. 5 spring JDBC API 中存在哪些类？

JdbcTemplate
SimpleJdbcTemplate
NamedParameterJdbcTemplate
SimpleJdbcInsert
SimpleJdbcCall

## 30. 9 Spring支持的事务管理类型， spring 事务实现方式有哪些？

Spring支持两种类型的事务管理：
编程式事务管理：这意味你通过编程的方式管理事务，给你带来极大的灵活性，但是难维
护。
声明式事务管理：这意味着你可以将业务代码和事务管理分离，你只需用注解和XML配置来
管理事务。

## 31. 12 说一下 spring 的事务隔离？

spring 有五大隔离级别，默认值为 ISOLATION_DEFAULT（使用数据库的设置），其他四个隔离
级别和数据库的隔离级别一致：

## 32. 13 Spring框架的事务管理有哪些优点？

为不同的事务API 如 JTA，JDBC，Hibernate，JPA 和JDO，提供一个不变的编程模式。
为编程式事务管理提供了一套简单的API而不是一些复杂的事务API
支持声明式事务管理。
和Spring各种数据访问抽象层很好得集成。

## 33. 14 你更倾向用那种事务管理类型？

大多数Spring框架的用户选择声明式事务管理，因为它对应用代码的影响最小，因此更符合一个无
侵入的轻量级容器的思想。声明式事务管理要优于编程式事务管理，虽然比编程式事务管理（这种
方式允许你通过代码控制事务）少了一点灵活性。唯一不足地方是，最细粒度只能作用到方法级
别，无法做到像编程式事务那样可以作用到代码块级别。

## 34. 8 Spring通知有哪些类型？

在AOP术语中，切面的工作被称为通知，实际上是程序执行时要通过SpringAOP框架触发的代码
段。
Spring切面可以应用5种类型的通知：

## 35. 9 什么是切面 Aspect？

aspect 由 pointcount 和 advice 组成，切面是通知和切点的结合。 它既包含了横切逻辑的定义,
也包括了连接点的定义. Spring AOP 就是负责实施切面的框架, 它将切面所定义的横切逻辑编织到
切面所指定的连接点中. AOP 的工作重心在于如何将增强编织目标对象的连接点上, 这里包含两个
工作:
如何通过 pointcut 和 advice 定位到特定的 joinpoint 上
如何在 advice 中编写切面代码.
可以简单地认为, 使用 @Aspect 注解的类就是切面.

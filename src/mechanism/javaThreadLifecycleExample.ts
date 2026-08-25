import {
  RelationKind,
  VisualTone,
  VisualWeight,
  entityId,
  processId,
  processStepId,
  relationId,
  type MechanismModel,
  type MechanismProcess,
} from './core';

export const JAVA_THREAD_ENTITIES = {
  thread: entityId('java.thread.instance'),
  scheduler: entityId('java.thread.scheduler'),
  monitor: entityId('java.thread.monitor'),
  lock: entityId('java.thread.lock'),
  stateNew: entityId('java.thread.state.new'),
  stateRunnable: entityId('java.thread.state.runnable'),
  stateRunning: entityId('java.thread.state.running'),
  stateReady: entityId('java.thread.state.ready'),
  stateWaiting: entityId('java.thread.state.waiting'),
  stateTimedWaiting: entityId('java.thread.state.timed-waiting'),
  stateBlocked: entityId('java.thread.state.blocked'),
  stateTerminated: entityId('java.thread.state.terminated'),
} as const;

export const JAVA_THREAD_RELATIONS = {
  threadEntersNew: relationId('java.thread.enters-new'),
  threadStartsRunnable: relationId('java.thread.starts-runnable'),
  runnableSchedulesRunning: relationId('java.thread.runnable-schedules-running'),
  runningYieldsReady: relationId('java.thread.running-yields-ready'),
  readySchedulesRunning: relationId('java.thread.ready-schedules-running'),
  runningWaitsWaiting: relationId('java.thread.running-waits-waiting'),
  waitingNotifiesRunnable: relationId('java.thread.waiting-notifies-runnable'),
  runningSleepsTimedWaiting: relationId('java.thread.running-sleeps-timed-waiting'),
  timedWaitingWakesRunnable: relationId('java.thread.timed-waiting-wakes-runnable'),
  runningBlocksBlocked: relationId('java.thread.running-blocks-blocked'),
  blockedAcquiresRunnable: relationId('java.thread.blocked-acquires-runnable'),
  runningCompletesTerminated: relationId('java.thread.running-completes-terminated'),
  monitorGuardsWaiting: relationId('java.thread.monitor-guards-waiting'),
  lockGuardsBlocked: relationId('java.thread.lock-guards-blocked'),
} as const;

export const javaThreadLifecycleModel: MechanismModel = {
  entities: [
    {
      id: JAVA_THREAD_ENTITIES.thread,
      label: 'Thread instance',
      note: 'The Java Thread object whose lifecycle is being traced.',
    },
    {
      id: JAVA_THREAD_ENTITIES.scheduler,
      label: 'OS scheduler',
      note: 'Decides which READY thread receives CPU time.',
    },
    {
      id: JAVA_THREAD_ENTITIES.monitor,
      label: 'Object monitor',
      note: 'Guards wait/notify coordination on an object.',
    },
    {
      id: JAVA_THREAD_ENTITIES.lock,
      label: 'synchronized lock',
      note: 'The monitor lock required to enter synchronized code.',
    },
    {
      id: JAVA_THREAD_ENTITIES.stateNew,
      label: 'NEW',
      note: 'Thread created but start() not yet called.',
    },
    {
      id: JAVA_THREAD_ENTITIES.stateRunnable,
      label: 'RUNNABLE',
      note: 'Umbrella state covering READY and RUNNING.',
    },
    {
      id: JAVA_THREAD_ENTITIES.stateRunning,
      label: 'RUNNING',
      note: 'Actively executing bytecode on a CPU core.',
    },
    {
      id: JAVA_THREAD_ENTITIES.stateReady,
      label: 'READY',
      note: 'Eligible to run, waiting for scheduler dispatch.',
    },
    {
      id: JAVA_THREAD_ENTITIES.stateWaiting,
      label: 'WAITING',
      note: 'Parked indefinitely until explicitly notified.',
    },
    {
      id: JAVA_THREAD_ENTITIES.stateTimedWaiting,
      label: 'TIMED_WAITING',
      note: 'Parked with a timeout; wakes on expiry or notify.',
    },
    {
      id: JAVA_THREAD_ENTITIES.stateBlocked,
      label: 'BLOCKED',
      note: 'Waiting to acquire a synchronized monitor lock.',
    },
    {
      id: JAVA_THREAD_ENTITIES.stateTerminated,
      label: 'TERMINATED',
      note: 'Execution finished; cannot be restarted.',
    },
  ],
  relations: [
    {
      id: JAVA_THREAD_RELATIONS.threadEntersNew,
      kind: RelationKind.RoutesTo,
      source: JAVA_THREAD_ENTITIES.thread,
      target: JAVA_THREAD_ENTITIES.stateNew,
      label: '实例化',
    },
    {
      id: JAVA_THREAD_RELATIONS.threadStartsRunnable,
      kind: RelationKind.RoutesTo,
      source: JAVA_THREAD_ENTITIES.stateNew,
      target: JAVA_THREAD_ENTITIES.stateRunnable,
      label: 'Thread.start()',
    },
    {
      id: JAVA_THREAD_RELATIONS.runnableSchedulesRunning,
      kind: RelationKind.RoutesTo,
      source: JAVA_THREAD_ENTITIES.stateRunnable,
      target: JAVA_THREAD_ENTITIES.stateRunning,
      label: '系统调度分配 CPU',
    },
    {
      id: JAVA_THREAD_RELATIONS.runningYieldsReady,
      kind: RelationKind.RoutesTo,
      source: JAVA_THREAD_ENTITIES.stateRunning,
      target: JAVA_THREAD_ENTITIES.stateReady,
      label: 'yield() / 时间片用完',
    },
    {
      id: JAVA_THREAD_RELATIONS.readySchedulesRunning,
      kind: RelationKind.RoutesTo,
      source: JAVA_THREAD_ENTITIES.stateReady,
      target: JAVA_THREAD_ENTITIES.stateRunning,
      label: '系统调度获得 CPU',
    },
    {
      id: JAVA_THREAD_RELATIONS.runningWaitsWaiting,
      kind: RelationKind.RoutesTo,
      source: JAVA_THREAD_ENTITIES.stateRunning,
      target: JAVA_THREAD_ENTITIES.stateWaiting,
      label: 'Object.wait() / join() / park()',
    },
    {
      id: JAVA_THREAD_RELATIONS.waitingNotifiesRunnable,
      kind: RelationKind.RoutesTo,
      source: JAVA_THREAD_ENTITIES.stateWaiting,
      target: JAVA_THREAD_ENTITIES.stateRunnable,
      label: 'notify() / notifyAll() / unpark()',
    },
    {
      id: JAVA_THREAD_RELATIONS.runningSleepsTimedWaiting,
      kind: RelationKind.RoutesTo,
      source: JAVA_THREAD_ENTITIES.stateRunning,
      target: JAVA_THREAD_ENTITIES.stateTimedWaiting,
      label: 'sleep() / wait(long) / join(long) / parkNanos',
    },
    {
      id: JAVA_THREAD_RELATIONS.timedWaitingWakesRunnable,
      kind: RelationKind.RoutesTo,
      source: JAVA_THREAD_ENTITIES.stateTimedWaiting,
      target: JAVA_THREAD_ENTITIES.stateRunnable,
      label: '超时 / notify / unpark',
    },
    {
      id: JAVA_THREAD_RELATIONS.runningBlocksBlocked,
      kind: RelationKind.RoutesTo,
      source: JAVA_THREAD_ENTITIES.stateRunning,
      target: JAVA_THREAD_ENTITIES.stateBlocked,
      label: '等待进入 synchronized',
    },
    {
      id: JAVA_THREAD_RELATIONS.blockedAcquiresRunnable,
      kind: RelationKind.RoutesTo,
      source: JAVA_THREAD_ENTITIES.stateBlocked,
      target: JAVA_THREAD_ENTITIES.stateRunnable,
      label: '获取到锁',
    },
    {
      id: JAVA_THREAD_RELATIONS.runningCompletesTerminated,
      kind: RelationKind.RoutesTo,
      source: JAVA_THREAD_ENTITIES.stateRunning,
      target: JAVA_THREAD_ENTITIES.stateTerminated,
      label: '执行完成',
    },
    {
      id: JAVA_THREAD_RELATIONS.monitorGuardsWaiting,
      kind: RelationKind.Locks,
      source: JAVA_THREAD_ENTITIES.monitor,
      target: JAVA_THREAD_ENTITIES.stateWaiting,
      label: '协调等待/唤醒',
    },
    {
      id: JAVA_THREAD_RELATIONS.lockGuardsBlocked,
      kind: RelationKind.Locks,
      source: JAVA_THREAD_ENTITIES.lock,
      target: JAVA_THREAD_ENTITIES.stateBlocked,
      label: '阻塞竞争',
    },
  ],
};

export const javaThreadLifecycleProcess: MechanismProcess = {
  id: processId('java.thread.lifecycle.process'),
  label: 'Java 线程生命周期状态机',
  steps: [
    {
      id: processStepId('java.thread.step.instantiate'),
      label: '线程实例化，进入 NEW 状态',
      relationId: JAVA_THREAD_RELATIONS.threadEntersNew,
      entityVisuals: [
        { entityId: JAVA_THREAD_ENTITIES.thread, tone: VisualTone.Active, weight: VisualWeight.Strong },
        { entityId: JAVA_THREAD_ENTITIES.stateNew, tone: VisualTone.Active, weight: VisualWeight.Strong },
      ],
      relationVisuals: [
        { relationId: JAVA_THREAD_RELATIONS.threadEntersNew, tone: VisualTone.Active, weight: VisualWeight.Strong },
      ],
    },
    {
      id: processStepId('java.thread.step.start'),
      label: '调用 start()，进入 RUNNABLE',
      relationId: JAVA_THREAD_RELATIONS.threadStartsRunnable,
      entityVisuals: [
        { entityId: JAVA_THREAD_ENTITIES.stateNew, tone: VisualTone.Traversed, weight: VisualWeight.Normal },
        { entityId: JAVA_THREAD_ENTITIES.stateRunnable, tone: VisualTone.Active, weight: VisualWeight.Strong },
      ],
      relationVisuals: [
        { relationId: JAVA_THREAD_RELATIONS.threadStartsRunnable, tone: VisualTone.Active, weight: VisualWeight.Strong },
      ],
    },
    {
      id: processStepId('java.thread.step.dispatch'),
      label: '操作系统调度，分配 CPU 进入 RUNNING',
      relationId: JAVA_THREAD_RELATIONS.runnableSchedulesRunning,
      entityVisuals: [
        { entityId: JAVA_THREAD_ENTITIES.scheduler, tone: VisualTone.Active, weight: VisualWeight.Normal },
        { entityId: JAVA_THREAD_ENTITIES.stateRunnable, tone: VisualTone.Traversed, weight: VisualWeight.Normal },
        { entityId: JAVA_THREAD_ENTITIES.stateRunning, tone: VisualTone.Active, weight: VisualWeight.Strong },
      ],
      relationVisuals: [
        { relationId: JAVA_THREAD_RELATIONS.runnableSchedulesRunning, tone: VisualTone.Active, weight: VisualWeight.Strong },
      ],
    },
    {
      id: processStepId('java.thread.step.yield'),
      label: '时间片用完或 yield()，回到 READY',
      relationId: JAVA_THREAD_RELATIONS.runningYieldsReady,
      entityVisuals: [
        { entityId: JAVA_THREAD_ENTITIES.stateRunning, tone: VisualTone.Traversed, weight: VisualWeight.Normal },
        { entityId: JAVA_THREAD_ENTITIES.stateReady, tone: VisualTone.Active, weight: VisualWeight.Strong },
      ],
      relationVisuals: [
        { relationId: JAVA_THREAD_RELATIONS.runningYieldsReady, tone: VisualTone.Traversed, weight: VisualWeight.Strong },
      ],
    },
    {
      id: processStepId('java.thread.step.wait'),
      label: '调用 wait() / join() / park()，进入 WAITING',
      relationId: JAVA_THREAD_RELATIONS.runningWaitsWaiting,
      entityVisuals: [
        { entityId: JAVA_THREAD_ENTITIES.monitor, tone: VisualTone.Guarded, weight: VisualWeight.Normal },
        { entityId: JAVA_THREAD_ENTITIES.stateRunning, tone: VisualTone.Traversed, weight: VisualWeight.Normal },
        { entityId: JAVA_THREAD_ENTITIES.stateWaiting, tone: VisualTone.Guarded, weight: VisualWeight.Strong },
      ],
      relationVisuals: [
        { relationId: JAVA_THREAD_RELATIONS.runningWaitsWaiting, tone: VisualTone.Guarded, weight: VisualWeight.Strong },
        { relationId: JAVA_THREAD_RELATIONS.monitorGuardsWaiting, tone: VisualTone.Guarded, weight: VisualWeight.Soft },
      ],
    },
    {
      id: processStepId('java.thread.step.notify'),
      label: 'notify() / unpark() 唤醒，回到 RUNNABLE',
      relationId: JAVA_THREAD_RELATIONS.waitingNotifiesRunnable,
      entityVisuals: [
        { entityId: JAVA_THREAD_ENTITIES.monitor, tone: VisualTone.Active, weight: VisualWeight.Normal },
        { entityId: JAVA_THREAD_ENTITIES.stateWaiting, tone: VisualTone.Traversed, weight: VisualWeight.Normal },
        { entityId: JAVA_THREAD_ENTITIES.stateRunnable, tone: VisualTone.Active, weight: VisualWeight.Strong },
      ],
      relationVisuals: [
        { relationId: JAVA_THREAD_RELATIONS.waitingNotifiesRunnable, tone: VisualTone.Active, weight: VisualWeight.Strong },
      ],
    },
    {
      id: processStepId('java.thread.step.sleep'),
      label: '调用 sleep() / wait(long)，进入 TIMED_WAITING',
      relationId: JAVA_THREAD_RELATIONS.runningSleepsTimedWaiting,
      entityVisuals: [
        { entityId: JAVA_THREAD_ENTITIES.stateRunning, tone: VisualTone.Traversed, weight: VisualWeight.Normal },
        { entityId: JAVA_THREAD_ENTITIES.stateTimedWaiting, tone: VisualTone.Guarded, weight: VisualWeight.Strong },
      ],
      relationVisuals: [
        { relationId: JAVA_THREAD_RELATIONS.runningSleepsTimedWaiting, tone: VisualTone.Guarded, weight: VisualWeight.Strong },
      ],
    },
    {
      id: processStepId('java.thread.step.timeout'),
      label: '超时或被唤醒，回到 RUNNABLE',
      relationId: JAVA_THREAD_RELATIONS.timedWaitingWakesRunnable,
      entityVisuals: [
        { entityId: JAVA_THREAD_ENTITIES.stateTimedWaiting, tone: VisualTone.Traversed, weight: VisualWeight.Normal },
        { entityId: JAVA_THREAD_ENTITIES.stateRunnable, tone: VisualTone.Active, weight: VisualWeight.Strong },
      ],
      relationVisuals: [
        { relationId: JAVA_THREAD_RELATIONS.timedWaitingWakesRunnable, tone: VisualTone.Active, weight: VisualWeight.Strong },
      ],
    },
    {
      id: processStepId('java.thread.step.block'),
      label: '竞争 synchronized 锁失败，进入 BLOCKED',
      relationId: JAVA_THREAD_RELATIONS.runningBlocksBlocked,
      entityVisuals: [
        { entityId: JAVA_THREAD_ENTITIES.lock, tone: VisualTone.Guarded, weight: VisualWeight.Normal },
        { entityId: JAVA_THREAD_ENTITIES.stateRunning, tone: VisualTone.Traversed, weight: VisualWeight.Normal },
        { entityId: JAVA_THREAD_ENTITIES.stateBlocked, tone: VisualTone.Guarded, weight: VisualWeight.Strong },
      ],
      relationVisuals: [
        { relationId: JAVA_THREAD_RELATIONS.runningBlocksBlocked, tone: VisualTone.Guarded, weight: VisualWeight.Strong },
        { relationId: JAVA_THREAD_RELATIONS.lockGuardsBlocked, tone: VisualTone.Guarded, weight: VisualWeight.Soft },
      ],
    },
    {
      id: processStepId('java.thread.step.acquire'),
      label: '获取到监视器锁，回到 RUNNABLE',
      relationId: JAVA_THREAD_RELATIONS.blockedAcquiresRunnable,
      entityVisuals: [
        { entityId: JAVA_THREAD_ENTITIES.lock, tone: VisualTone.Released, weight: VisualWeight.Normal },
        { entityId: JAVA_THREAD_ENTITIES.stateBlocked, tone: VisualTone.Traversed, weight: VisualWeight.Normal },
        { entityId: JAVA_THREAD_ENTITIES.stateRunnable, tone: VisualTone.Active, weight: VisualWeight.Strong },
      ],
      relationVisuals: [
        { relationId: JAVA_THREAD_RELATIONS.blockedAcquiresRunnable, tone: VisualTone.Active, weight: VisualWeight.Strong },
      ],
    },
    {
      id: processStepId('java.thread.step.terminate'),
      label: 'run() 执行完成，进入 TERMINATED',
      relationId: JAVA_THREAD_RELATIONS.runningCompletesTerminated,
      entityVisuals: [
        { entityId: JAVA_THREAD_ENTITIES.stateRunning, tone: VisualTone.Traversed, weight: VisualWeight.Normal },
        { entityId: JAVA_THREAD_ENTITIES.stateTerminated, tone: VisualTone.Persisted, weight: VisualWeight.Strong },
      ],
      relationVisuals: [
        { relationId: JAVA_THREAD_RELATIONS.runningCompletesTerminated, tone: VisualTone.Persisted, weight: VisualWeight.Strong },
      ],
    },
  ],
};

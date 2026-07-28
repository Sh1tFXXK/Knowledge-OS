# 监控（同步）

> 来源：[维基百科 en 条目](https://en.wikipedia.org/wiki/Monitor_(synchronization))  
> 整理日期：2026-07-24  
> 说明：由 `scripts/import-wikipedia.mjs` 自动从维基 wikitext 转换为 Markdown，（正文由机器翻译，链接与结构保留原文）。

---

在并发编程中，**监视器**是一种同步构造，它可以防止线程同时访问共享对象的状态*并*允许它们等待状态更改。  它们为线程提供了一种机制，可以暂时放弃独占访问，以便在重新获得独占访问并恢复其任务之前等待满足某些条件。  监视器由一个互斥体（锁）和至少一个条件变量组成。  当对象的状态被修改时，**条件变量**被显式地“发出信号”，临时将互斥体传递给另一个“等待”条件变量的线程。

**监视器**的另一个定义是包含并使用[互斥体](https://en.wikipedia.org/wiki/mutual_exclusion)的**线程安全**[对象](https://en.wikipedia.org/wiki/object_(computer_science))、[类](https://en.wikipedia.org/wiki/class_(computer_science))或[模块](https://en.wikipedia.org/wiki/module_(programming))安全地允许多个[线程](https://en.wikipedia.org/wiki/thread_(computer_science))访问其方法或变量。  监视器的定义特征是其方法以[互斥](https://en.wikipedia.org/wiki/mutual_exclusion)执行：在每个时间点，最多一个线程可能正在执行监视器的任何[方法](https://en.wikipedia.org/wiki/method_(computer_science))。通过使用一个或多个条件变量，它还可以为线程提供等待特定条件的能力（从而使用“监视器”的第一个定义）。  在本文的其余部分中，这种“监视器”的含义将被称为“线程安全对象/类/模块”。

监视器是由 [Per Brinch Hansen](https://en.wikipedia.org/wiki/Per_Brinch_Hansen) 和 [C. A. R. Hoare](https://en.wikipedia.org/wiki/C._A._R._Hoare)，并首先以 [Brinch Hansen](https://en.wikipedia.org/wiki/Per_Brinch_Hansen) [Concurrent Pascal](https://en.wikipedia.org/wiki/Concurrent_Pascal) 语言实现。

---

## 相互排斥

当线程正在执行线程安全对象的方法时，据说通过持有其[互斥锁（锁）](https://en.wikipedia.org/wiki/lock_(computer_science))来“占用”该对象。  线程安全对象的实现是为了强制*在任何时间点，最多一个线程可以占用该对象*。  最初解锁的锁在每个公共方法开始时被锁定，并在每个公共方法每次返回时解锁。

在调用其中一个方法时，线程必须等待，直到没有其他线程正在执行该线程安全对象的任何方法，然后才能开始执行其方法。请注意，如果没有这种互斥，两个线程可能会导致数据争用和逻辑错误。例如，两个线程从账户中提取 1000 可能都返回 true，但会导致余额只减少 1000，如下所示：首先，两个线程都获取当前余额，发现它大于 1000，然后减去 1000；然后，两个线程都存储余额并返回。

## 条件变量

### 问题陈述

对于许多应用程序来说，互斥是不够的。尝试操作的线程可能需要等待，直到某些条件成立。一个[忙等待](https://en.wikipedia.org/wiki/busy_waiting)循环

**同时****不**()**做****跳过**

将不起作用，因为互斥将阻止任何其他线程进入监视器以使条件成立。还存在其他“解决方案”，例如使用一个循环来解锁监视器、等待一定时间、锁定监视器并检查条件。理论上，它可以工作并且不会陷入僵局，但会出现问题。很难确定适当的等待时间：太小，线程会占用 CPU，太大，则明显没有响应。我们需要的是一种在条件为真（或“可能”为真）时向线程发出信号的方法。

### 案例研究：经典的有界生产者/消费者问题

一个经典的并发问题是**有界生产者/消费者**，其中存在一个具有最大大小的任务的[队列](https://en.wikipedia.org/wiki/queue_(data_struct))或[环形缓冲区](https://en.wikipedia.org/wiki/circular_buffer)，一个或多个线程是向队列添加任务的“生产者”线程，一个或多个其他线程是从队列中取出任务的“消费者”线程队列。  假设队列本身是非线程安全的，它可以是空的、满的、或者介于空和满之间。  每当队列充满任务时，我们就需要生产者线程阻塞，直到消费者线程有空间将任务出队。  另一方面，每当队列为空时，我们就需要消费者线程阻塞，直到由于生产者线程添加它们而有更多任务可用。

由于队列是线程之间共享的并发对象，因此对它的访问必须是[原子](https://en.wikipedia.org/wiki/atomicity_(database_systems))，因为在队列访问过程中队列可能会进入**不一致状态**，而这种状态永远不应该在线程之间公开。  因此，访问队列的任何代码都构成一个必须通过互斥同步的**[关键部分](https://en.wikipedia.org/wiki/ritic_section)**。  如果访问队列的代码关键部分中的代码和处理器指令可以通过同一处理器上的线程之间的任意上下文切换或多个处理器上同时运行的线程来**交错**，则存在暴露不一致状态并导致竞争条件的风险。

#### 不同步不正确

一种幼稚的方法是设计带有**忙等待**且不同步的代码，使代码受到竞争条件的影响：

全局RingBuffer队列； // 任务的线程不安全环形缓冲区。

// 代表每个生产者线程行为的方法：
公共方法生产者（）{
    而（真）{
        任务 myTask = ...; // 生产者添加一些新任务。
        while (queue.isFull()) {} // 忙等待，直到队列未满。
        队列.enqueue(myTask); // 将任务添加到队列中。
    }
}

// 代表每个消费者线程行为的方法：
公共方法消费者（）{
    而（真）{
        while (queue.isEmpty()) {} // 忙等待，直到队列非空。
        myTask = queue.dequeue(); // 从队列中取出一个任务。
        doStuff(我的任务); // 继续执行任务。
    }
}

该代码有一个严重的问题，即对队列的访问可能会被中断，并与其他线程对队列的访问交错。  *queue.enqueue* 和 *queue.dequeue* 方法可能具有更新队列成员变量的指令，例如队列大小、开始和结束位置、队列元素的赋值和分配等。此外，*queue.isEmpty()* 和 *queue.isFull()* 方法也读取此共享状态。  如果允许生产者/消费者线程在调用入队/出队期间交错，则可能会暴露队列的不一致状态，从而导致竞争条件。  此外，如果一个消费者在另一个消费者退出忙等待并调用“出队”之间使队列为空，那么第二个消费者将尝试从空队列中出队，从而导致错误。  同样，如果一个生产者在另一个生产者退出忙等待并调用“入队”之间使队列变满，那么第二个生产者将尝试添加到已满的队列中，从而导致错误。

#### 旋转等待

正如上面提到的，实现同步的一种简单方法是使用“**自旋等待**”，其中使用互斥锁来保护代码的关键部分，并且仍然使用忙等待，在每次忙等待检查之间获取和释放锁。

全局RingBuffer队列； // 任务的线程不安全环形缓冲区。
全局锁queueLock； // 任务环形缓冲区的互斥体。

// 代表每个生产者线程行为的方法：
公共方法生产者（）{
    而（真）{
        任务 myTask = ...; // 生产者添加一些新任务。

队列锁.acquire(); // 获取初始忙等待检查的锁。
        while (queue.isFull()) { // 忙等待，直到队列未满。
            队列锁.release();
            // 暂时释放锁，为其他线程提供机会
            // 需要queueLock运行以便消费者可以接受任务。
            队列锁.acquire(); // 重新获取下次调用“queue.isFull()”的锁。
        }

队列.enqueue(myTask); // 将任务添加到队列中。
        队列锁.release(); // 删除队列锁，直到我们再次需要它来添加下一个任务。
    }
}

// 代表每个消费者线程行为的方法：
公共方法消费者（）{
    而（真）{
        队列锁.acquire(); // 获取初始忙等待检查的锁。
        while (queue.isEmpty()) { // 忙等待，直到队列非空。
            队列锁.release();
            // 暂时释放锁，为其他线程提供机会
            // 需要queueLock运行以便生产者可以添加任务。
队列锁.acquire(); // 为下一次调用“queue.isEmpty()”重新获取锁。
        }
        myTask = queue.dequeue(); // 从队列中取出一个任务。
        队列锁.release(); // 删除队列锁，直到我们再次需要它来完成下一个任务。
        doStuff(我的任务); // 继续执行任务。
    }
}

这种方法保证了不会出现不一致的状态，但由于不必要的忙等待而浪费了CPU资源。  即使队列是空的，生产者线程很长时间没有什么可添加的，消费者线程也总是处于不必要的忙等待状态。  同样，即使消费者在处理当前任务时被阻塞很长时间并且队列已满，生产者也总是忙于等待。  这是一种浪费的机制。  我们需要的是一种使生产者线程阻塞直到队列非满的方法，以及一种使消费者线程阻塞直到队列非空的方法。

（注意：互斥体本身也可以是**自旋锁**，它涉及忙等待以获得锁，但为了解决浪费 CPU 资源的问题，我们假设 *queueLock* 不是自旋锁，并正确使用阻塞锁队列本身。）

### 条件变量

解决方案是使用**条件变量**。从概念上讲，条件变量是与互斥体关联的线程队列，线程可以在该队列上等待某些条件变为真。因此，每个条件变量都与一个[断言](https://en.wikipedia.org/wiki/assertion_(computing)) PC 相关联。当线程正在等待条件变量时，该线程不被视为占用监视器，因此其他线程可能会进入监视器以更改监视器的状态。在大多数类型的监视器中，这些其他线程可能会向条件变量发出信号以指示断言 Pc 在当前状态下为 true。

因此对条件变量的操作主要有以下三种：
-**等待**c, m，其中 *c* 是条件变量，m 是与监视器关联的[互斥锁（锁）](https://en.wikipedia.org/wiki/lock_(computer_science))。  此操作由一个线程调用，该线程需要等待断言 Pc 为 true 后才能继续。  当线程等待时，它不占用监视器。  “等待”操作的功能和基本契约是执行以下步骤：
1. [原子地](https://en.wikipedia.org/wiki/atomic_operation):
  2. : 释放互斥体*m*,
  3. 一旦该线程随后被通知/发信号（见下文）并恢复，则自动重新获取互斥体 *m*。
- ：步骤 1a 和 1b 可以按任意顺序发生，1c 通常发生在它们之后。  当线程处于睡眠状态并在 *c* 的等待队列中时，下一个要执行的[程序计数器](https://en.wikipedia.org/wiki/program_counter)位于步骤 2，在“等待”函数/[子例程](https://en.wikipedia.org/wiki/subroutine)的中间。  因此，线程会休眠，然后在“等待”操作过程中唤醒。
- ：步骤 1 中操作的原子性对于避免由于它们之间的抢占式线程切换而导致的竞争条件非常重要。  如果这些不是原子的，则可能发生的一种故障模式是“错过唤醒”，其中线程可能位于 *c* 的睡眠队列上并已释放互斥体，但在线程进入睡眠状态之前发生了抢占式线程切换，并且另一个线程在 *c* 上调用信号操作（见下文），将第一个线程移回 *c* 的队列。  一旦第一个相关线程切换回，其程序计数器将位于步骤 1c，并且它将休眠并且无法再次唤醒，这违反了它在休眠时应位于 *c* 的休眠队列中的不变量。  其他竞争条件取决于步骤 1a 和 1b 的顺序，并取决于发生[上下文切换](https://en.wikipedia.org/wiki/context_switch)的位置。
-**signal**c，也称为**notify**c，由线程调用以指示断言 Pc 为真。  根据监视器的类型和实现，这会将一个或多个线程从 c 的睡眠队列移动到“就绪队列”或另一个要执行的队列。  通常认为最佳实践是在释放与 *c* 关联的互斥体 *m* 之前执行“信号”操作，但只要代码针对并发性进行了正确设计，并且根据线程实现，在发出信号之前释放锁通常也是可以接受的。  根据线程实现的不同，其顺序可能会影响调度优先级。  （一些作者反而提倡在发出信号之前释放锁。）线程实现应该记录对此顺序的任何特殊约束。
-**broadcast**c，也称为**notifyAll**c，是一个类似的操作，唤醒c的等待队列中的所有线程。  这会清空等待队列。  通常，当多个谓词条件与同一条件变量关联时，应用程序将需要**广播**而不是**信号**，因为等待错误条件的线程可能会被唤醒，然后立即返回睡眠状态，而不会唤醒等待刚刚变为真的正确条件的线程。  否则，如果谓词条件与其关联的条件变量是一对一的，那么**信号**可能比**广播**更有效。

作为设计规则，多个条件变量可以与同一个互斥体关联，但反之则不然。  （这是一对多）（https://en.wikipedia.org/wiki/multivalued_function）对应。）这是因为谓词 Pc 对于使用监视器的所有线程都是相同的，并且必须受到与所有其他线程的互斥保护，这些线程可能会导致条件更改，或者可能会在相关线程导致条件更改时读取它，但可能有不同的线程想要等待同一变量上的不同条件，需要使用相同的互斥锁。  在生产者-消费者示例中[如上所述](https://en.wikipedia.org/wiki/#Case_study:_classic_bounded_ Producer.2Fconsumer_problem)，队列必须由唯一的互斥对象 *m* 保护。  “生产者”线程将希望使用锁 *m* 和条件变量等待监视器，该变量会阻塞直到队列未满。  “消费者”线程将希望使用相同的互斥体 *m* 但使用不同的条件变量来等待不同的监视器，该变量会阻塞直到队列非空。  对于同一条件变量使用不同的互斥体（通常）是没有意义的，但这个经典示例说明了为什么使用相同互斥体的多个条件变量通常肯定是有意义的。  一个或多个条件变量（一个或多个监视器）使用的互斥锁也可以与不*不*使用条件变量的代码共享（并且仅获取/释放它而不需要任何等待/信号操作），如果这些[关键部分](https://en.wikipedia.org/wiki/ritic_section)不碰巧需要等待并发数据上的某个条件。

### 监控使用情况

监视器的正确基本用法是：

获取(m)； // 获取该监视器的锁。
while (!p) { // 虽然我们正在等待的条件/谓词/断言不为真...
	等待（米，简历）； // 等待该监视器的锁和条件变量。
}
// ...代码的关键部分放在这里...
信号（CV2）； // 或者：广播(cv2);
             // cv2 可能与 cv 相同或不同。
释放（米）； // 释放该监视器的锁。

以下是相同的[伪代码](https://en.wikipedia.org/wiki/pseudocode)，但有更详细的注释以更好地解释正在发生的事情：

// ...（之前的代码）
// 即将进入监视器。
// 获取与并发关联的咨询互斥锁（锁）
// 线程之间共享的数据，
// 确保没有两个线程可以抢占式交错或
// 在关键状态下执行时在不同内核上同时运行
// 读取或写入相同并发数据的部分。如果另一个
// 线程持有这个互斥体，那么这个线程将被置于睡眠状态
//（阻塞）并放置在 m 的睡眠队列中。  （互斥体“m”不得
// 自旋锁。）
获取(m)；
// 现在，我们持有锁并可以检查条件
// 第一次。

// 上面之后我们第一次执行while循环条件
// “获取”，我们问，“是条件/谓词/断言
// 我们正在等待已经为真了吗？”

while (!p()) // “p”是任何表达式（例如变量或
		// 函数调用）检查条件并
		// 计算结果为布尔值。  这本身就是一个关键
		// 部分，所以你*必须*在以下情况下持有锁
		// 执行这个“while”循环条件！

// 如果这不是第一次检查“while”条件，
// 然后我们问这个问题，“现在另一个线程使用这个
// 监视器已通知我并唤醒我并且我已进行上下文切换
// 回到我们正在等待的条件/谓词/断言是否停留
// 在我被唤醒的时间和我重新获得的时间之间为 true
// 该循环最后一次迭代中“wait”调用内的锁，或者
// 是否有其他线程导致条件再次变为 false
// 同时这使得这是一个虚假的唤醒？

{
	// 如果这是循环的第一次迭代，那么答案是
	//“否”——条件尚未准备好。否则，答案是：
	// 后者。  这是一个虚假唤醒，发生了其他一些线程
	// 首先，导致条件再次变为 false，我们必须
	// 再等一下。

等待（米，简历）；
		// Temporarily prevent any other thread on any core from doing
		// 对 m 或 cv 的操作。
		// release(m) 		// Atomically release lock "m" so other
		// // 使用此并发数据的代码
		// // 可以操作，将这个线程移动到cv的
		// // 等待队列以便收到通知
		// // 当条件变为时
		// // true，并睡眠该线程。重新启用
		// // 其他线程和核心要做的事情
		// // 对 m 和 cv 的操作。
		//
// 上下文切换发生在该核心上。
		//
		// 在未来的某个时间，我们等待的条件变为
		// true，并且使用此监视器的另一个线程 (m, cv) 执行任一操作
		// 碰巧唤醒该线程的信号，或者
		// 唤醒我们的广播，意味着我们已经被带走了
		// cv 的等待队列。
		//
		// 在此期间，其他线程可能会导致该情况发生
		// 再次变为 false，或者条件可能会切换一个或多个
// 次，或者它可能碰巧保持为真。
		//
		// 该线程切换回某个核心。
		//
		// acquire(m) // 重新获取锁“m”。

// 结束本次循环迭代并重新检查“while”循环条件以使
	// 确保谓词仍然为真。

}

// 我们等待的条件为真！
// 我们仍然持有锁，无论是在进入监视器之前还是从
// 最后一次执行“wait”。

// 代码的关键部分放在这里，它的前提条件是我们的谓词
// 必须为真。
// 此代码可能会使 cv 的条件为假，和/或使其他条件变量'
// 谓词为真。

// 调用信号还是广播，取决于哪个条件变量'
// 谓词（谁共享互斥体 m）已为真或可能已为真，
// 以及正在使用的监视器语义类型。

for (cv_x in cvs_to_signal) {
	信号（cv_x）； // 或者：广播(cv_x);
}
// 一个或多个线程已被唤醒，但一旦尝试就会阻塞
// 获取m。

// 释放互斥锁，以便被通知的线程和其他线程可以进入其关键线程
// 部分。
释放（米）；

#### 解决有界生产者/消费者问题

部分

介绍了条件变量的用法后，让我们用它来重新审视并解决经典的有界生产者/消费者问题。  经典的解决方案是使用两个监视器，其中两个条件变量共享队列上的一个锁：

全局易失性RingBuffer队列； // 任务的线程不安全环形缓冲区。
全局锁queueLock； // 任务环形缓冲区的互斥体。 （不是自旋锁。）
全局CV队列EmptyCV； // 消费者线程等待队列的条件变量
				        // 变为非空。其关联的锁是“queueLock”。
全局CV队列FullCV； // 生产者线程等待队列的条件变量
// 变为非满。其关联的锁也是“queueLock”。

// 代表每个生产者线程行为的方法：
公共方法生产者（）{
    而（真）{
        // 生产者添加一些新任务。
        任务 myTask = ...;

// 获取“queueLock”以进行初始谓词检查。
        队列锁.acquire();

// 检查队列是否未满的关键部分。
        while (queue.isFull()) {
            // 释放“queueLock”，将该线程加入“queueFullCV”队列并睡眠该线程。
            等待（queueLock，queueFullCV）；
            // 当该线程被唤醒时，重新获取“queueLock”以进行下一次谓词检查。
        }

// 将任务添加到队列的关键部分（请注意，我们持有“queueLock”）。
        队列.enqueue(myTask);

// 唤醒一个或所有正在等待队列非空的消费者线程
        // 既然已经保证了，那么消费者线程将接管该任务。
        信号（queueEmptyCV）； // 或者：广播(queueEmptyCV);
        // 临界区结束。

// 释放“queueLock”，直到我们再次需要它来添加下一个任务。
        队列锁.release();
    }
}

// 代表每个消费者线程行为的方法：
公共方法消费者（）{
    而（真）{
        // 获取“queueLock”以进行初始谓词检查。
        队列锁.acquire();

// 检查队列是否非空的关键部分。
        while (queue.isEmpty()) {
            // 释放“queueLock”，将该线程放入“queueEmptyCV”队列并睡眠该线程。
            等待（queueLock，queueEmptyCV）；
            // 当该线程被唤醒时，重新获取“queueLock”以进行下一次谓词检查。
        }

// 将任务从队列中取出的关键部分（请注意，我们持有“queueLock”）。
        myTask = queue.dequeue();

// 唤醒一个或所有等待队列未满的生产者线程
        // 既然已经保证了，那么生产者线程就会添加一个任务。
        信号（queueFullCV）； // 或者：广播(queueFullCV);
        // 临界区结束。

// 释放“queueLock”，直到我们再次需要它来执行下一个任务。
        队列锁.release();

// 继续执行任务。
        doStuff(我的任务);
    }
}

这确保了共享任务队列的生产者线程和消费者线程之间的并发性，并阻塞那些无事可做的线程，而不是如上述使用自旋锁的方法所示的忙等待线程。

该解决方案的一个变体可以为生产者和消费者使用单个条件变量，可能命名为“queueFullOrEmptyCV”或“queueSizeChangedCV”。  在这种情况下，多于一个的条件与条件变量相关联，使得条件变量表示比各个线程正在检查的条件更弱的条件。  条件变量表示正在等待队列非满的线程*和等待队列非空的线程。  然而，这样做需要在所有使用条件变量的线程中使用“广播”，并且不能使用常规的“信号”。  这是因为常规*信号*可能会唤醒尚未满足条件的错误类型的线程，并且该线程将在没有正确类型的线程收到信号的情况下返回睡眠状态。  例如，生产者可能使队列已满并唤醒另一个生产者而不是消费者，并且被唤醒的生产者将返回睡眠状态。  在互补的情况下，消费者可能会将队列清空并唤醒另一个消费者而不是生产者，然后消费者将重新进入睡眠状态。  使用“广播”可确保某些正确类型的线程将按问题陈述的预期进行。

这是仅使用一个条件变量和广播的变体：

全局易失性RingBuffer队列； // 任务的线程不安全环形缓冲区。
全局锁queueLock； // 任务环形缓冲区的互斥体。  （不是自旋锁。）
全局CV队列FullOrEmptyCV； // 当队列没有为任何线程准备好时的单个条件变量
                              // 即对于等待队列未满的生产者线程
                              // 消费者线程等待队列变为非空。
// 其关联的锁是“queueLock”。
                              // 使用常规“信号”不安全，因为它与
                              // 多个谓词条件（断言）。

// 代表每个生产者线程行为的方法：
公共方法生产者（）{
    而（真）{
        // 生产者添加一些新任务。
        任务 myTask = ...;

// 获取“queueLock”以进行初始谓词检查。
        队列锁.acquire();

// 检查队列是否未满的关键部分。
        while (queue.isFull()) {
            // 释放“queueLock”，将该线程加入“queueFullOrEmptyCV”队列并睡眠该线程。
            等待（queueLock，queueFullOrEmptyCV）；
            // 当该线程被唤醒时，重新获取“queueLock”以进行下一次谓词检查。
        }

// 将任务添加到队列的关键部分（请注意，我们持有“queueLock”）。
        队列.enqueue(myTask);

// 分别唤醒所有正在等待队列的生产者和消费者线程
        // 非满且非空，既然后者得到保证，那么消费者线程将接管该任务。
        广播（队列FullOrEmptyCV）； // 不要使用“信号”（因为它可能只会唤醒另一个生产者线程）。
        // 临界区结束。

// 释放“queueLock”，直到我们再次需要它来添加下一个任务。
        队列锁.release();
    }
}

// 代表每个消费者线程行为的方法：
公共方法消费者（）{
    而（真）{
        // 获取“queueLock”以进行初始谓词检查。
        队列锁.acquire();

// 检查队列是否非空的关键部分。
        while (queue.isEmpty()) {
            // 释放“queueLock”，将该线程加入“queueFullOrEmptyCV”队列并睡眠该线程。
            等待（queueLock，queueFullOrEmptyCV）；
            // 当该线程被唤醒时，重新获取“queueLock”以进行下一次谓词检查。
        }

// 将任务从队列中取出的关键部分（请注意，我们持有“queueLock”）。
        myTask = queue.dequeue();

// 分别唤醒所有正在等待队列的生产者和消费者线程
        // 非满和非空现在前者得到保证，因此生产者线程将添加任务。
        广播（队列FullOrEmptyCV）； // 不要使用“信号”（因为它可能只会唤醒另一个消费者线程）。
        // 临界区结束。

// 释放“queueLock”，直到我们再次需要它来执行下一个任务。
        队列锁.release();

// 继续执行任务。
        doStuff(我的任务);
    }
}

### 同步原语

监视器是使用[原子](https://en.wikipedia.org/wiki/linearizability)读取-修改-写入原语和等待原语来实现的。读-修改-写原语（通常是测试和设置或比较和交换）通常采用[ISA]（https://en.wikipedia.org/wiki/instruction_set_architecture）提供的内存锁定指令的形式，但也可以在禁用中断时由单处理器设备上的非锁定指令组成。等待原语可以是一个[busy-wait](https://en.wikipedia.org/wiki/busy-wait)循环或操作系统提供的原语，它可以防止线程被[调度](https://en.wikipedia.org/wiki/Scheduling_(computing))直到准备好继续。

以下是线程系统部分部分以及互斥体和 Mesa 风格条件变量的示例伪代码实现，使用**测试和设置**和先来先服务的策略：

#### 通过测试和设置实现 Mesa 监视器示例

部分

// 线程系统的基本部分：
// 假设“ThreadQueue”支持随机访问。
公共易失性线程队列就绪队列； // 线程不安全的就绪线程队列。  元素是（线程*）。
公共易失性全局线程* currentThread; // 假设该变量是针对每个核心的。  （其他的都是共享的。）

// 仅在线程系统本身的同步状态上实现自旋锁。
// 这与测试和设置一起用作同步原语。
公共易失性全局布尔线程SystemBusy = false;

// 上下文切换中断服务程序 (ISR):
// 在当前CPU核心上，抢占式切换到另一个线程。
公共方法 contextSwitchISR() {
    if (testAndSet(threadingSystemBusy)) {
        返回； // 现在无法切换上下文。
    }

// 确保此中断不会再次发生，这会扰乱上下文切换：
    systemCall_disableInterrupts();

// 获取当前运行进程的所有寄存器。
    // 对于程序计数器（PC），我们需要指令位置
    // 下面的“恢复”标签。  获取寄存器值取决于平台，并且可能涉及
    // 读取当前栈帧、JMP/CALL指令等（详细内容不在此讨论范围）
    currentThread->registers = getAllRegisters(); // 将寄存器存储在内存中的“currentThread”对象中。
当前线程->registers.PC = 恢复； // 在此方法中将下一个PC设置为下面的“resume”标签。

ReadyQueue.enqueue(currentThread); // 将此线程放回就绪队列以供稍后执行。

线程* otherThread = ReadyQueue.dequeue(); // 从就绪队列中移除并获取下一个要运行的线程。

当前线程 = 其他线程； // 替换全局当前线程指针值，以便为下一个线程做好准备。

// 从currentThread/otherThread恢复寄存器，包括跳转到另一个线程存储的PC
    //（在下面的“恢复”中）。  同样，如何完成此操作的细节超出了本范围。
    恢复寄存器(otherThread.registers);

//***现在运行“otherThread”（现在是“currentThread”）！  原来的线程现在处于“睡眠”状态。***

resume: // 这是另一个 contextSwitch() 调用在将上下文切换回此处时需要将 PC 设置为的位置。

// 返回到 otherThread 停止的地方。

线程系统忙=假； // 必须是原子赋值。
    systemCall_enableInterrupts(); // 在此核心上重新打开抢占式切换。
}

// 线程休眠方法：
// 在当前CPU核心上，同步上下文切换到另一个线程而不放置
// 就绪队列中的当前线程。
// 必须保持“threadingSystemBusy”并禁用中断，以便此方法
// 不会被调用 contextSwitchISR() 的线程切换计时器中断。
// 从该方法返回后，必须清除“threadingSystemBusy”。
公共方法 threadSleep() {
// 获取当前运行进程的所有寄存器。
    // 对于程序计数器（PC），我们需要指令位置
    // 下面的“恢复”标签。  获取寄存器值取决于平台，并且可能涉及
    // 读取当前栈帧、JMP/CALL指令等（详细内容不在此讨论范围）
    currentThread->registers = getAllRegisters(); // 将寄存器存储在内存中的“currentThread”对象中。
当前线程->registers.PC = 恢复； // 在此方法中将下一个PC设置为下面的“resume”标签。

// 与 contextSwitchISR() 不同，我们不会将 currentThread 放回到readyQueue 中。
    // 相反，它已经被放入互斥体或条件变量的队列中。

线程* otherThread = ReadyQueue.dequeue(); // 从就绪队列中移除并获取下一个要运行的线程。

当前线程 = 其他线程； // 替换全局当前线程指针值，以便为下一个线程做好准备。

// 从currentThread/otherThread恢复寄存器，包括跳转到另一个线程存储的PC
    //（在下面的“恢复”中）。  同样，如何完成此操作的细节超出了本范围。
    恢复寄存器(otherThread.registers);

//***现在运行“otherThread”（现在是“currentThread”）！  原来的线程现在处于“睡眠”状态。***

resume: // 这是另一个 contextSwitch() 调用在将上下文切换回此处时需要将 PC 设置为的位置。

// 返回到 otherThread 停止的地方。
}

公共方法 wait(Mutex m, ConditionVariable c) {
    // 当任何核心上的其他线程正在访问该对象时，内部自旋锁
    //“hold”和“threadQueue”，或“readyQueue”。
    while (testAndSet(threadingSystemBusy)) {}
    // 注意：“threadingSystemBusy”现在为 true。

// 系统调用禁用该核心上的中断，以便 threadSleep() 不会被中断
    // 该核心上的线程切换计时器将调用 contextSwitchISR()。
    // 在 threadSleep() 之外完成以提高效率，以便该线程将被休眠
    // 在进入条件变量队列之后。
    systemCall_disableInterrupts();

断言 m.hold； // （具体来说，该线程必须是持有它的线程。）

m.release();
    c.waitingThreads.enqueue(currentThread);

线程睡眠（）；

// 线程休眠...线程从信号/广播中唤醒。

线程系统忙=假； // 必须是原子赋值。
    systemCall_enableInterrupts(); // 在此核心上重新打开抢占式切换。

// 台面风格：
    // 上下文切换现在可能发生在这里，使客户端调用者的谓词为假。

m.acquire();
}

公共方法信号（ConditionVariable c）{
    // 当任何核心上的其他线程正在访问该对象时，内部自旋锁
    //“hold”和“threadQueue”，或“readyQueue”。
    while (testAndSet(threadingSystemBusy)) {}
    // 注意：“threadingSystemBusy”现在为 true。

// 系统调用禁用该核心上的中断，以便 threadSleep() 不会被中断
    // 该核心上的线程切换计时器将调用 contextSwitchISR()。
    // 在 threadSleep() 之外完成以提高效率，以便该线程将被休眠
    // 在进入条件变量队列之后。
    systemCall_disableInterrupts();

if (!c.waitingThreads.isEmpty()) {
        wakenThread = c.waitingThreads.dequeue();
        ReadyQueue.enqueue(wokenThread);
    }

线程系统忙=假； // 必须是原子赋值。
    systemCall_enableInterrupts(); // 在此核心上重新打开抢占式切换。

// 台面风格：
    // 唤醒的线程没有任何优先级。
}

公共方法广播（ConditionVariable c）{
    // 当任何核心上的其他线程正在访问该对象时，内部自旋锁
    //“hold”和“threadQueue”，或“readyQueue”。
    while (testAndSet(threadingSystemBusy)) {}
    // 注意：“threadingSystemBusy”现在为 true。

// 系统调用禁用该核心上的中断，以便 threadSleep() 不会被中断
    // 该核心上的线程切换计时器将调用 contextSwitchISR()。
    // 在 threadSleep() 之外完成以提高效率，以便该线程将被休眠
    // 在进入条件变量队列之后。
    systemCall_disableInterrupts();

while (!c.waitingThreads.isEmpty()) {
        wakenThread = c.waitingThreads.dequeue();
        ReadyQueue.enqueue(wokenThread);
    }

线程系统忙=假； // 必须是原子赋值。
    systemCall_enableInterrupts(); // 在此核心上重新打开抢占式切换。

// 台面风格：
    // 唤醒的线程没有任何优先级。
}

互斥体类 {
    受保护的易失性布尔持有=假;
    私有易失性线程队列阻塞线程； // 阻塞线程的线程不安全队列。  元素是（线程*）。

公共方法 acquire() {
        // 当任何核心上的其他线程正在访问该对象时，内部自旋锁
        //“hold”和“threadQueue”，或“readyQueue”。
        while (testAndSet(threadingSystemBusy)) {}
        // 注意：“threadingSystemBusy”现在为 true。

// 系统调用禁用该核心上的中断，以便 threadSleep() 不会被中断
        // 该核心上的线程切换计时器将调用 contextSwitchISR()。
        // 在 threadSleep() 之外完成以提高效率，以便该线程将被休眠
        // 进入锁队列之后。
        systemCall_disableInterrupts();

断言！blockingThreads.contains(currentThread);

如果（举行）{
            // 将“currentThread”放入此锁的队列中，以便它
            // 认为该锁“休眠”。
            // 请注意，“currentThread”仍然需要由 threadSleep() 处理。
            readyQueue.remove(currentThread);
            阻塞线程.enqueue(currentThread);
            线程睡眠（）；

// 现在我们被唤醒了，这一定是因为“held”变成了 false。
            断言！持有；
            断言！blockingThreads.contains(currentThread);
        }

持有=真；

线程系统忙=假； // 必须是原子赋值。
        systemCall_enableInterrupts(); // 在此核心上重新打开抢占式切换。
    }

公共方法release() {
        // 当任何核心上的其他线程正在访问该对象时，内部自旋锁
        //“hold”和“threadQueue”，或“readyQueue”。
        while (testAndSet(threadingSystemBusy)) {}
        // 注意：“threadingSystemBusy”现在为 true。

// 系统调用以禁用该内核上的中断以提高效率。
        systemCall_disableInterrupts();

主张持有； //（释放只能在持有锁的情况下执行。）

持有=假；

if (!blockingThreads.isEmpty()) {
            线程* unblockedThread =blockingThreads.dequeue();
            ReadyQueue.enqueue(unblockedThread);
        }

线程系统忙=假； // 必须是原子赋值。
        systemCall_enableInterrupts(); // 在此核心上重新打开抢占式切换。
    }
}

结构条件变量 {
    易失性线程队列等待线程；
}

### 阻塞条件变量

最初的提议是[C. A. R. Hoare](https://en.wikipedia.org/wiki/C._A._R._Hoare) 和 [Per Brinch Hansen](https://en.wikipedia.org/wiki/Per_Brinch_Hansen) 用于*阻塞条件变量*。对于阻塞条件变量，发信号线程必须（至少）在监视器外等待，直到发信号线程通过返回或再次等待条件变量来放弃对监视器的占用。使用阻塞条件变量的监视器通常称为“霍尔式”监视器或“信号和紧急等待”监视器。

我们假设有两个线程队列与每个监视器对象关联
-e是入口队列
-s 是已发出信号的线程队列。
此外，我们假设对于每个条件变量，都有一个队列
- .q，这是等待条件变量的线程队列
所有队列通常都保证是[公平](https://en.wikipedia.org/wiki/Unbounded_nondeterminism#Fairness)，并且在某些实现中，可以保证是[先进先出](https://en.wikipedia.org/wiki/fIFO_(computing_and_ electronics))。

每个操作的实现如下。 （我们假设每个操作都以与其他操作互斥的方式运行；因此重新启动的线程在操作完成之前不会开始执行。）

输入监视器：
     输入方法
     **如果**显示器被锁定
         将此线程添加到 e
         阻止该线程
     **其他**
         锁定显示器

离开显示器：
     时间表
     **从方法中返回**

**等等**：
     将此线程添加到 .q
     时间表
     阻止该线程

**信号**：
     **如果**有一个线程正在等待 .q
         从 .q 中选择并删除一个这样的线程 t
         （t 称为“有信号线程”）
         将此线程添加到 s
         重新启动
         （所以接下来t将占据显示器）
         阻止该线程

时间表：
     **如果**s 上有一个线程
         选择并从 s 中删除一个线程并重新启动它
         （这个线程接下来会占用监视器）
     **else if**e 上有一个线程
         选择并从 e 中删除一个线程并重新启动它
         （这个线程接下来会占用监视器）
     **其他**
         解锁显示器
         （显示器将变为空闲状态）

调度例程选择下一个线程来占用监视器
或者，在没有任何候选线程的情况下，解锁监视器。

由此产生的信号规则被称为“信号和紧急等待”，因为信号发送者必须等待，但其优先级高于入口队列上的线程。另一种方法是“发出信号并等待”，其中没有 s 队列，而是信号发送者在 e 队列上等待。

一些实现提供了**信号和返回**操作，将信号发送与从过程返回相结合。

**信号****并返回**：
     **如果**有一个线程正在等待 .q
         从 .q 中选择并删除一个这样的线程 t
         （t 称为“有信号线程”）
         重新启动
         （所以接下来t将占据显示器）
     **其他**
         时间表
     **从方法中返回**

在任一情况下（“发出信号并紧急等待”或“发出信号并等待”），当条件变量发出信号并且至少有一个线程正在等待该条件变量时，发出信号的线程会将占用无缝地移交给发出信号的线程，以便其他线程无法在其间获得占用。如果 Pc 在每个**signal**操作开始时为 true，则在每个**wait**操作结束时也将为 true。以下[合同](https://en.wikipedia.org/wiki/design_by_contract)对此进行了总结。在这些合约中， 是监视器的[不变](https://en.wikipedia.org/wiki/invariant_(computer_science))。

输入监视器：
     **后置条件**

离开显示器：
     **前提条件**

**等等**：
     **前提条件****修改**监视器的状态
     **后置条件**PC**和**

**信号**：
     **前提条件**电脑**和****修改**监视器的状态
     **后置条件**

**信号****并返回**：
     **前提条件**电脑**和**

在这些合同中，假设 和 Pc 不依赖于
任何队列的内容或长度。

（当条件变量可以查询在其队列上等待的线程数量时，可以给出更复杂的契约。例如，一对有用的契约，允许在不建立不变量的情况下传递占用率，是：

**等等**：
     **前提条件****修改**监视器的状态
     **后置条件**PC

**信号****前提条件**（**不是**empty()**和**PC）**或**（empty()**和**）
     **修改**监视器的状态
     **后置条件**

（有关更多信息，请参阅 Howard 和 Buhr *等人*。）

断言Pc完全由程序员决定；他或她只需要对其内容保持一致即可。

我们以一个使用阻塞监视器的线程安全类示例来结束本节，该监视器实现了有界的[线程安全](https://en.wikipedia.org/wiki/thread_safety)[stack](https://en.wikipedia.org/wiki/stack_(data_struct))。

**监控类***SharedStack* {
     **私有常量**容量：= 10
     **私有***int*[容量] A
     **私有***int* 大小 := 0
     **不变**0 <= 大小**和**大小 <= 容量
     **私有***BlockingCondition* theStackIsNotEmpty /***关联于**0 < 大小**且**大小 <= 容量 */
     **私有***BlockingCondition* theStackIsNotFull /***关联于**0 <= 大小**和**大小 < 容量 */

**公共方法**Push(*int* value)
     {
         **如果**大小 = 容量**则****等待**theStackIsNotFull
         **断言**0 <= 大小**和**大小 < 容量
         A[大小] := 值 ;大小 := 大小 + 1
         **断言**0 < 大小**和**大小 <= 容量
         **向StackIsNotEmpty发出信号**并返回**
     }

**公共方法***int* pop()
     {
         **如果**大小= 0**则****等待**theStackIsNotEmpty
         **断言**0 < 大小**和**大小 <= 容量
         大小 := 大小 - 1 ;
         **断言**0 <= 大小**和**大小 < 容量
         **发出信号**StackIsNotFull**并返回**A[size]
     }
 }

请注意，在此示例中，线程安全堆栈在内部提供互斥锁，与前面的生产者/消费者示例一样，该互斥锁由两个条件变量共享，这两个条件变量正在检查相同并发数据的不同条件。  唯一的区别是，生产者/消费者示例假设了一个常规的非线程安全队列，并使用独立的互斥体和条件变量，而没有抽象出监视器的这些细节，就像这里的情况一样。  在此示例中，当调用“等待”操作时，必须以某种方式为其提供线程安全堆栈的互斥体，例如如果“等待”操作是“监视器类”的集成部分。  除了这种抽象功能之外，当使用“原始”监视器时，它“总是”必须包含互斥体和条件变量，每个条件变量都有一个唯一的互斥体。

### 非阻塞条件变量

使用*非阻塞条件变量*（也称为*“Mesa 样式”*条件变量或“信号并继续”*条件变量），发信号不会导致发信号线程失去对监视器的占用。相反，已发出信号的线程会移至 e 队列。不需要s队列。

对于非阻塞条件变量，**信号**操作通常称为**通知**——我们将在此处遵循这个术语。提供“通知所有”操作也很常见，该操作将等待条件变量的所有线程移动到 e 队列。

这里给出了各种操作的含义。 （我们假设每个操作都以与其他操作互斥的方式运行；因此重新启动的线程在操作完成之前不会开始执行。）

输入监视器：
     输入方法
     **如果**显示器被锁定
         将此线程添加到 e
         阻止该线程
     **其他**
         锁定显示器

离开显示器：
     时间表
     **从方法中返回**

**等等**：
     将此线程添加到 .q
     时间表
     阻止该线程

**通知**：
     如果有一个线程正在等待 .q
         从 .q 中选择并删除一个线程 t
         （t称为“被通知的线程”）
         将 t 移至 e

**通知所有人**：
     将等待 .q 的所有线程移至 e

时间表：
     **如果**e 上有一个线程
         选择并从 e 中删除一个线程并重新启动它
     **其他**
         解锁显示器

作为该方案的变体，被通知的线程可以被移动到名为 w 的队列，该队列的优先级高于 e。进一步讨论请参阅 Howard 和 Buhr *等人*。

可以将断言 Pc 与每个条件变量相关联，以便从**wait**返回时 Pc 一定为 true。然而，人们必须
确保从通知线程放弃占用直到选择通知线程重新进入监视器为止，Pc 都被保留。在这段时间之间，其他居住者可能会进行活动。因此，Pc 通常是“true”。

因此，通常需要将每个**wait**操作包含在这样的循环中

**同时****不**()**做****等待**c

其中某个条件比 Pc 更强。**notify**和**notify all**操作被视为“提示”，对于某些等待线程来说可能是正确的。
经过第一次循环的每次迭代都代表丢失的通知；因此，对于非阻塞监视器，必须小心确保不会丢失太多通知。

作为“提示”的示例，请考虑一个银行帐户，其中提款线程将等到帐户有足够的资金后再继续操作

**监控类***帐户* {
     **私人***int* 余额 := 0
     **不变**余额 >= 0
     **私有***非阻塞条件* 余额可能足够大

**公共方法**提款(*int* amount)
         **前提**金额 >= 0
     {
         **当**余额 < 金额**执行****等待**余额可能足够大
         **断言**余额 >= 金额
         余额 := 余额 - 金额
     }

**公开方法**存款(*int*金额)
         **前提**金额 >= 0
     {
         余额：=余额+金额
         **通知所有人**余额可能足够大
     }
 }

在此示例中，等待的条件是要提取的金额的函数，因此存款线程不可能“知道”它使这样的条件成立。在这种情况下，允许每个等待线程进入监视器（一次一个）来检查其断言是否为真是有意义的。

### 隐式条件变量监视器

在Java语言中，每个对象都可以用作监视器。需要互斥的方法必须使用**[synchronized](https://en.wikipedia.org/wiki/Java_keyword)**关键字显式标记。代码块也可以用**[synchronized](https://en.wikipedia.org/wiki/Java_keyword)**.Bloch 标记

每个监视器（即对象）除了其入口队列之外还配备了一个等待队列，而不是具有显式条件变量。所有等待都在这个单个等待队列上完成，所有**notify**和**notifyAll**操作都适用于该队列。Bloch 这种方法已在其他语言中采用，例如 [C#](https://en.wikipedia.org/wiki/C_Sharp_(programming_language))。

### 隐式信号

另一种发信号的方法是省略**signal**操作。每当线程离开监视器（通过返回或等待）时，都会评估所有等待线程的断言，直到发现其中一个为 true。在这样的系统中，不需要条件变量，但必须对断言进行显式编码。等待合同是

**等等**：
     **前提条件****修改**监视器的状态
     **后置条件****和**

## 历史

Brinch Hansen 和 Hoare 在 20 世纪 70 年代初基于他们自己和 [Edsger Dijkstra](https://en.wikipedia.org/wiki/E._W._Dijkstra) 的早期想法开发了监视器概念。 Brinch Hansen 发布了第一个监视器表示法，采用了 [Simula 67](https://en.wikipedia.org/wiki/Simula) 的 [class](https://en.wikipedia.org/wiki/Class_(programming)) 概念，并发明了一种排队机制。霍尔完善了进程恢复的规则。 Brinch Hansen 在 [Concurrent Pascal](https://en.wikipedia.org/wiki/Concurrent_Pascal) 中创建了监视器的第一个实现。霍尔证明了它们与[信号量](https://en.wikipedia.org/wiki/semaphore_(programming))的等价性。

监视器（和 Concurrent Pascal）很快就被用来在 [Solo 操作系统](https://en.wikipedia.org/wiki/Solo_operating_system) 中构建进程同步。

支持监视器的编程语言包括：
- [Ada](https://en.wikipedia.org/wiki/Ada_(programming_language)) 自 Ada 95 起（作为受保护对象）
- [C#](https://en.wikipedia.org/wiki/C_Sharp_(programming_language))（以及使用 [.NET Framework](https://en.wikipedia.org/wiki/.NET_Framework) 的其他语言）
- [并发 Euclid](https://en.wikipedia.org/wiki/Concurrent_Euclid)
- [并发 Pascal](https://en.wikipedia.org/wiki/Concurrent_Pascal)
- [D](https://en.wikipedia.org/wiki/D_(programming_language))
- [Delphi](https://en.wikipedia.org/wiki/Delphi_(programming_language))（Delphi 2009 及更高版本，通过 TObject.Monitor）
- [Java](https://en.wikipedia.org/wiki/Java_(programming_language))（通过等待和通知方法）
- [Go](https://en.wikipedia.org/wiki/Go_(programming_language))
- [Mesa](https://en.wikipedia.org/wiki/Mesa_(programming_language))
- [Modula-3](https://en.wikipedia.org/wiki/Modula-3)
- [Python](https://en.wikipedia.org/wiki/Python_(programming_language)) (通过 [threading.Condition](https://docs.python.org/library/threading.html#condition-objects) 对象）
- [Ruby](https://en.wikipedia.org/wiki/Ruby_(programming_language))
- [吱吱声](https://en.wikipedia.org/wiki/Squeak) Smalltalk
- [图灵](https://en.wikipedia.org/wiki/Turing_(programming_language))、[图灵+](https://en.wikipedia.org/wiki/Turing%2B)和[面向对象图灵](https://en.wikipedia.org/wiki/Object-Oriented_Turing)
- [μC++](https://en.wikipedia.org/wiki/%CE%BCC%2B%2B)
- [视觉 Prolog](https://en.wikipedia.org/wiki/Visual_Prolog)

已经编写了许多库，允许使用本身不支持监视器的语言来构建监视器。当使用库调用时，程序员需要明确标记执行的代码的开始和结束，并进行互斥。 [Pthreads](https://en.wikipedia.org/wiki/POSIX_Threads) 就是这样的库之一。

## 参见

- [互斥](https://en.wikipedia.org/wiki/Mutual_exclusion)
- [通信顺序进程](https://en.wikipedia.org/wiki/Communicating_sequential_processes) 
- [C. A. R. 霍尔](https://en.wikipedia.org/wiki/C._A._R._Hoare)
- [信号量（编程）](https://en.wikipedia.org/wiki/Semaphore_(编程))

## 笔记

## 进一步阅读

- 《Effective Java：编程语言指南》（Joshua Bloch，2018 年，Addison-Wesley）
- 监视器：操作系统结构概念，C. A. R. Hoare – [ACM 通信](https://en.wikipedia.org/wiki/Communications_of_the_ACM)，v.17 n.10，p. 17 549–557，1974 年 10 月 <http://doi.acm.org/10.1145/355620.361161>
- 监视器分类 P.A.布尔，M.福蒂尔，M.H. Coffin – [ACM 计算调查](https://en.wikipedia.org/wiki/ACM_Computing_Surveys)，1995 <http://doi.acm.org/10.1145/214037.214100>

## 外部链接

- [Java 监视器（清晰解释）](http://www.artima.com/insidejvm/ed2/threadsynch.html)
- “[监视器：操作系统结构概念](https://web.archive.org/web/20060830171518/http://www.acm.org/classics/feb96/)”，作者：[C. A. R. 霍尔](https://en.wikipedia.org/wiki/C._A._R._Hoare)
- “[监视器中的信号发送](http://portal.acm.org/itation.cfm?id=807647)”

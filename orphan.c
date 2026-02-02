#include <stdio.h>
#include <unistd.h>

int main() {
    pid_t pid = fork();

    if (pid > 0) {
        printf("Parent process exiting...\n");
    }
    else if (pid == 0) {
        sleep(5);
        printf("Child process running...\n");
        printf("New Parent PID: %d\n", getppid());
    }

    return 0;
}

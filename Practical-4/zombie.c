#include <stdio.h>
#include <unistd.h>

int main() {
    pid_t pid = fork();

    if (pid > 0) {
        sleep(10);  // Parent sleeps, child becomes zombie
        printf("Parent process\n");
    }
    else if (pid == 0) {
        printf("Child process exiting\n");
    }

    return 0;
}
